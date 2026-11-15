"use client";

import type { InputHTMLAttributes } from "react";
import { PUNE_LOCALITIES } from "../lib/properties";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "list">;

export default function LocalityAutocomplete(props: Props) {
  return (
    <>
      <input {...props} list="naren-pune-localities" autoComplete="off" />
      <datalist id="naren-pune-localities">
        {PUNE_LOCALITIES.map((locality) => <option key={locality} value={locality} />)}
      </datalist>
    </>
  );
}
