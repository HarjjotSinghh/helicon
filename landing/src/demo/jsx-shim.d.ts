// The product UI was written against React 18 types, which exposed a global JSX namespace.
import type { JSX as ReactJSX } from "react";

declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
  }
}
