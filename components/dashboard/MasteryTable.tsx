type Row = {
  id: string;
  name: string;
  total: number;
  built: number;
  fire: number;
  rubble: number;
  mastery: number;
  patternAccuracy: number | null;
  calibrationError: number | null;
};

type Props = {
  districts: Row[];
};

export function MasteryTable({ districts }: Props) {
  const sorted = [...districts].sort((a, b) => a.mastery - b.mastery);

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-[#b0893d]/50 font-display text-[var(--ink-muted)]">
            <th className="py-2 pr-3">District</th>
            <th className="py-2 pr-3">Mastery</th>
            <th className="py-2 pr-3">Built</th>
            <th className="py-2 pr-3">Fire</th>
            <th className="py-2 pr-3">Rubble</th>
            <th className="py-2 pr-3">1st-try pattern</th>
            <th className="py-2">Calibration err</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.id} className="border-b border-[#b0893d]/25">
              <td className="py-2 pr-3 font-display">
                <a href={`/district/${d.id}`} className="hover:text-[var(--ember)]">
                  {d.name}
                </a>
              </td>
              <td className="py-2 pr-3">{Math.round(d.mastery * 100)}%</td>
              <td className="py-2 pr-3">
                {d.built}/{d.total}
              </td>
              <td className="py-2 pr-3 text-[var(--ember)]">{d.fire}</td>
              <td className="py-2 pr-3 text-[var(--smoke)]">{d.rubble}</td>
              <td className="py-2 pr-3">
                {d.patternAccuracy == null ? "—" : `${Math.round(d.patternAccuracy * 100)}%`}
              </td>
              <td className="py-2">
                {d.calibrationError == null ? "—" : d.calibrationError.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[var(--ink-muted)]">
        Weakest districts sort to the top. Calibration error = average |confidence/5 − correctness|; lower is better.
      </p>
    </div>
  );
}
