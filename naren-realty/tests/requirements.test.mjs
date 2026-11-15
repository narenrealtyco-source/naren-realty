import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const compile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exportsFor = (code, dependencies) => {
  const exports = {};
  vm.runInNewContext(code, { exports, FormData, Date, console: { error() {} }, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  } });
  return exports;
};
const lib = exportsFor(compile(await readFile(new URL("../app/lib/requirements.ts", import.meta.url), "utf8")), {
  "./property-search": { matchesPropertyLocation: (p, location) => p.locality.toLowerCase().includes(location.toLowerCase()) },
});
const id = "11aa1111-1111-4111-8111-111111111111";
function matchForm() {
  const form = new FormData();
  for (const [k,v] of Object.entries({purpose:"Rent",category:"Flat",location:"Baner",bedrooms:"2",min_budget:"10000",max_budget:"20000",move_in_date:"2026-12-01",details:"",customer_name:"Customer",phone:"9876543210",customer_id:"forged"})) form.set(k,v);
  return form;
}
function loanForm() {
  const form = new FormData();
  for (const [k,v] of Object.entries({customer_name:"Customer",phone:"9876543210",email:"",loan_type_id:id,amount:"1000000",property_location:"",property_value:"",employment:"Salaried",details:"",customer_id:"forged"})) form.set(k,v);
  return form;
}
test("requirement validation rejects invalid category, budgets, dates and contact", () => {
  assert.equal(lib.validateMatch(matchForm()).bedrooms, 2);
  for (const [key,value] of [["purpose","Buy"],["min_budget","30000"],["phone","123"],["move_in_date","2026-02-30"]]) {
    const form = matchForm(); form.set(key,value);
    if (key === "purpose") form.set("category","PG");
    assert.throws(() => lib.validateMatch(form));
  }
  for (const [key,value] of [["loan_type_id","bad"],["amount","0"],["employment","Invalid"],["email","invalid"]]) {
    const form = loanForm(); form.set(key,value); assert.throws(() => lib.validateLoan(form));
  }
});
test("matches use approved type, actual location, price and bedroom data", () => {
  const requirement = { ...lib.validateMatch(matchForm()), id, status:"New" };
  const listing = { status:"Approved", type:"Rental", locality:"Baner", price:15000, bedrooms:2 };
  assert.equal(lib.matchesRequirement(requirement, listing), true);
  for (const change of [{status:"Rejected"},{type:"Resale"},{locality:"Wakad"},{price:0},{price:21000},{bedrooms:0},{bedrooms:3}]) assert.equal(lib.matchesRequirement(requirement, {...listing,...change}),false);
});
test("guard, authentication and insert failures prevent success", async () => {
  const code = compile(await readFile(new URL("../app/requirements-actions.ts", import.meta.url), "utf8"));
  for (const [ready,user,error,expected] of [[false,{id},null,"error"],[true,null,null,"error"],[true,{id},{code:"42501"},"error"],[true,{id},null,"success"]]) {
    const writes = [];
    const actions = exportsFor(code, {
      "next/cache":{revalidatePath(){}},
      "./lib/requirements":{...lib,requirementsReady:()=>ready},
      "./lib/supabase-server":{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})},from:table=>({insert:async(payload)=>{writes.push({table,payload}); return {error};}})})},
    });
    for (const [kind,form] of [["match",matchForm()],["loan",loanForm()]]) assert.equal((await actions.submitRequirement(kind,{},form)).status,expected);
    assert.equal(writes.length,ready && user ? 2 : 0);
    for (const write of writes) assert.equal(Object.hasOwn(write.payload,"customer_id"),false);
  }
});
test("proposal isolates customer rows and admin-only followups", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0019_requirements_proposal.sql", import.meta.url),"utf8");
  assert.match(sql,/customer_id uuid not null default auth\.uid\(\)/);
  assert.match(sql,/using \(customer_id = auth\.uid\(\) or public\.is_admin\(\)\)/);
  assert.match(sql,/Admins read requirement followups/);
  assert.match(sql,/Admins edit loan requirements.*using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/);
  assert.match(sql,/auth\.uid\(\) is null or public\.is_admin\(\) is not true/);
  assert.doesNotMatch(sql,/grant .*requirement_followups to anon/i);
});
test("requirements remain disabled pending live verification", () => assert.equal(lib.requirementsReady(), false));

test("admin follow-up requires verified admin and does not report failed writes as success", async () => {
  const code = compile(await readFile(new URL("../app/requirements-actions.ts", import.meta.url), "utf8"));
  for (const [admin,error,expected] of [[false,null,"error"],[true,{code:"42501"},"error"],[true,null,"success"]]) {
    const calls = [];
    const actions = exportsFor(code, {
      "next/cache":{revalidatePath(){}},
      "./lib/requirements":{...lib,requirementsReady:()=>true},
      "./lib/supabase-server":{requireAdmin:async()=> {
        if (!admin) throw new Error("Forbidden");
        return {supabase:{rpc:async(name,args)=>{calls.push({name,args}); return {error};}}};
      }},
    });
    const form = new FormData();
    for (const [key,value] of Object.entries({id,kind:"loan",status:"Contacted",remarks:"Follow up",assigned_to:""})) form.set(key,value);
    assert.equal((await actions.updateRequirement({},form)).status,expected);
    assert.equal(calls.length,admin ? 1 : 0);
    if (admin) assert.equal(calls[0].name,"admin_update_requirement");
  }
});
