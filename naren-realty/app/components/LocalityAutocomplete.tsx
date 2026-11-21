"use client";

import { useId } from "react";
import type { InputHTMLAttributes } from "react";
import { PUNE_LOCALITIES } from "../lib/properties";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "list">;

/** Consistent Pune locality suggestions with free-text support for other areas. */
export default function LocalityAutocomplete(props: Props) {
  const generatedId = useId();
  const listId = `naren-localities-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <>
      <input {...props} list={listId} autoComplete="off" />
      <datalist id={listId}>
        {PUNE_LOCALITIES.map((locality) => <option key={locality} value={locality} />)}
      </datalist>
    </>
  );
}
