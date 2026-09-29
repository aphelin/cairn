import { Fragment } from "react";
import { COMPARE } from "@/lib/content";
import { Check, Cross } from "@/components/icons";
import styles from "./Compare.module.css";

// Against the settings you already have, and against willpower. Cairn's
// column is set as a solid bar, so the answer reads before the rows do.
export function Compare() {
  return (
    <section id="compare" className="section" data-theme="mist" aria-labelledby="compare-title">
      <div className="inner">
        <h2 id="compare-title" className="title" data-reveal="">
          Why not just set a limit?
        </h2>
        <div className={styles.wrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Cairn compared with built-in limits and willpower</caption>
            <thead>
              <tr>
                <td />
                {COMPARE.columns.map((c, i) => (
                  <th key={c} scope="col" data-us={i === 0 ? "" : undefined}>
                    <Words text={c} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={i} data-us={i === 0 ? "" : undefined}>
                      {v === true ? (
                        <>
                          <Check className={styles.yes} />
                          <span className="visually-hidden">Yes</span>
                        </>
                      ) : v === false ? (
                        <>
                          <Cross className={styles.no} />
                          <span className="visually-hidden">No</span>
                        </>
                      ) : (
                        keepTime(v)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// A narrow head breaks between its words, never at a hyphen: "Built-in"
// stays whole over "limits" instead of splitting as "Built- / in".
function Words({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className={styles.word}>{word}</span>
    </Fragment>
  ));
}

// "1 a.m." is one reading: a narrow cell never leaves the hour behind.
function keepTime(text: string) {
  return text.replace(/(\d) (?=[ap]\.m\.)/g, "$1\u00a0");
}
