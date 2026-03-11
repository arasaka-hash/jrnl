"use client";

import { useState, useEffect } from "react";

const STATUS_ITEMS: { message: string; code: string[] }[] = [
  {
    message: "downloading contextual memory to FORGE",
    code: ["forge.loadMemory()", "context: 0x7f2a...", ">> 12.4kb transferred"],
  },
  {
    message: "recalibrating based on world narrative",
    code: ["narrative.recalibrate()", "delta: 0.0023", ">> sync complete"],
  },
  {
    message: "host connected to NODE 80345",
    code: ["node.connect(80345)", "handshake: OK", ">> stream active"],
  },
  {
    message: "syncing neural pathways",
    code: ["pathway.sync()", "latency: 4ms", ">> 847 pathways linked"],
  },
  {
    message: "uploading experience to CORE",
    code: ["core.upload(exp)", "buffer: 0.8", ">> experience indexed"],
  },
  {
    message: "validating host integrity",
    code: ["host.validate()", "checksum: a3f2...", ">> integrity OK"],
  },
  {
    message: "establishing link to NODE 71209",
    code: ["link.establish(71209)", "auth: token", ">> connection open"],
  },
  {
    message: "processing ambient data stream",
    code: ["stream.process()", "rate: 1.2k/s", ">> pipeline active"],
  },
  {
    message: "integrating memory fragments",
    code: ["fragment.integrate()", "count: 23", ">> merge complete"],
  },
  {
    message: "handshake with FORGE complete",
    code: ["forge.handshake()", "version: 2.1", ">> ready"],
  },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function StatusUpdate() {
  const [item, setItem] = useState(STATUS_ITEMS[0]);
  const [visible, setVisible] = useState(false);
  const [codeLinesVisible, setCodeLinesVisible] = useState(0);

  useEffect(() => {
    const show = () => {
      setItem(pickRandom(STATUS_ITEMS));
      setVisible(true);
      setCodeLinesVisible(0);
    };

    show();
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => show(), 400);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hide = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(hide);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const lines = item.code.length;
    if (codeLinesVisible >= lines) return;
    const t = setTimeout(
      () => setCodeLinesVisible((n) => n + 1),
      300 + codeLinesVisible * 180
    );
    return () => clearTimeout(t);
  }, [visible, codeLinesVisible, item.code.length]);

  return (
    <div
      className={`status-update-modal ${visible ? "status-visible" : ""}`}
      aria-live="polite"
    >
      <div className="status-update-inner">
        <div className="status-message-row">
          <span className="status-prefix">&gt;</span>
          <span className="status-text">{item.message}</span>
        </div>
        <div className="status-code-appendix">
          {item.code.map((line, i) => (
            <div
              key={i}
              className={`status-code-line ${i < codeLinesVisible ? "status-code-visible" : ""}`}
            >
              <span className="status-code-prefix">$</span>
              <span className="status-code-text">{line}</span>
              {i === codeLinesVisible - 1 && (
                <span className="status-cursor" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
