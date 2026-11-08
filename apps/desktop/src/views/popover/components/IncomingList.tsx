import { Ic, ShotThumb } from "@hostbeam/ui";

import { t } from "../../../i18n";
import { openPulled, type Incoming } from "../../../lib/ipc";
import { SectionTitle } from "./SectionTitle";

export interface IncomingListProps {
  incoming: Incoming[];
  pulling: boolean;
  /** A pull has run at least once, so "nothing new" is an answer. */
  pulled: boolean;
  onPull: () => void;
}

/** What the agent left on the host, fetched on request. */
export function IncomingList({ incoming, pulling, pulled, onPull }: IncomingListProps) {
  return (
    <div style={{ padding: "4px 10px 8px", borderTop: "1px solid var(--separator)" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "6px 4px 4px" }}>
        <SectionTitle>{t("pop.fromHost")}</SectionTitle>
        <button
          onClick={onPull}
          disabled={pulling}
          style={{
            marginLeft: "auto",
            border: 0,
            background: "transparent",
            cursor: pulling ? "default" : "pointer",
            fontSize: 11,
            color: "var(--label-tertiary)",
            padding: "2px 4px",
            borderRadius: "var(--radius-xs)",
          }}
        >
          {pulling ? t("pop.pulling") : t("pop.check")}
        </button>
      </div>
      {incoming.map((f) => (
        <button
          key={f.local}
          onClick={() => openPulled(f.local)}
          title={t("pop.openLocally")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 6px",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            borderRadius: "var(--radius-md)",
            textAlign: "left",
          }}
        >
          {f.preview ? (
            <img
              src={f.preview}
              alt=""
              style={{ width: 38, height: 26, objectFit: "cover", borderRadius: 5 }}
            />
          ) : (
            <ShotThumb w={38} h={26} />
          )}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--label)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            {f.name}
          </span>
          <Ic name="external-link" size={13} className="hb-fg-tertiary" />
        </button>
      ))}
      {pulled && !pulling && !incoming.length ? (
        <div style={{ fontSize: 11, color: "var(--label-tertiary)", padding: "2px 6px 4px" }}>
          {t("pop.nothingNew")}
        </div>
      ) : null}
    </div>
  );
}
