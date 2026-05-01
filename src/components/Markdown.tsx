import React from "react";

/**
 * Минимальный безопасный markdown → React.
 * Поддержка: ## заголовки, **жирный**, *курсив*, - списки,
 * [текст](url), переносы строк (двойной \n = новый параграф).
 *
 * Никакого dangerouslySetInnerHTML — текст всегда escape'ится по конструкции.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let plain = "";

  const flushPlain = () => {
    if (plain) {
      out.push(plain);
      plain = "";
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // [text](url)
    const link = rest.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/);
    if (link) {
      flushPlain();
      const isExternal = link[2].startsWith("http");
      out.push(
        <a
          key={`${keyPrefix}-l-${i}`}
          href={link[2]}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
      i += link[0].length;
      continue;
    }

    // **bold**
    const bold = rest.match(/^\*\*([^*]+)\*\*/);
    if (bold) {
      flushPlain();
      out.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-bold text-zinc-100">
          {bold[1]}
        </strong>
      );
      i += bold[0].length;
      continue;
    }

    // *italic*
    const italic = rest.match(/^\*([^*]+)\*/);
    if (italic) {
      flushPlain();
      out.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {italic[1]}
        </em>
      );
      i += italic[0].length;
      continue;
    }

    plain += text[i];
    i++;
  }
  flushPlain();
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockId = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // ## heading
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const Tag = (`h${Math.min(level + 2, 6)}`) as "h3" | "h4" | "h5";
      const sizeCls =
        level === 1
          ? "text-xl font-bold mt-5 mb-2"
          : level === 2
            ? "text-lg font-bold mt-4 mb-2"
            : "text-base font-bold mt-3 mb-1.5";
      blocks.push(
        <Tag key={`b-${blockId++}`} className={`${sizeCls} text-zinc-100`}>
          {renderInline(h[2], `h${blockId}`)}
        </Tag>
      );
      i++;
      continue;
    }

    // - list (consecutive lines)
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul
          key={`b-${blockId++}`}
          className="list-disc list-inside space-y-1 my-2 text-zinc-300"
        >
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li${blockId}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // paragraph (consecutive non-empty lines glued by \n)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`b-${blockId++}`} className="text-zinc-300 leading-relaxed my-2">
        {renderInline(para.join(" "), `p${blockId}`)}
      </p>
    );
  }

  return <div className="space-y-1">{blocks}</div>;
}
