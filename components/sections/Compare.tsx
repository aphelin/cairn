import { COMPARE } from "@/lib/content";
import { Check, Cross } from "@/components/icons";
import styles from "./Compare.module.css";

// Why a stone: against the settings you already have, and against willpower.
export function Compare() {
  return (
    <section id="compare" className="section" data-ground="chalk" aria-labelledby="compare-title">
      <div className="inner">
        <h2 id="compare-title" className="title">
          Why a stone?
        </h2>
        <div className={styles.wrap}>
          <table className={styles.table}>
            <caption className="visually-hidden">Cairn compared with built-in limits and willpower</caption>
            <thead>
              <tr>
                <td />
                {COMPARE.columns.map((c, i) => (
                  <th key={c} scope="col" data-us={i === 0 ? "" : undefined}>
                    {c}
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
                        v
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
