/**
 * The outline of a legal document: every numbered heading, in document order.
 *
 * A document's headings, its table of contents and each "§" cross-reference all
 * read from one outline, so a renamed section cannot drift out of sync. Anchors
 * reproduce the GitHub slugs of the document's markdown source
 * (`#71-service-providers-processors`), so deep links written against the draft
 * resolve on the published page too.
 */

export type LegalSection<N extends string = string> = {
  number: N;
  title: string;
  id: string;
};

/** GitHub's heading slug for "7.1 Service providers (processors)". */
function anchorId(number: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${number.replace(/\./g, "")}-${slug}`;
}

export function createOutline<
  const T extends readonly (readonly [string, string])[],
>(entries: T) {
  type Number_ = T[number][0];

  const all = entries.map(([number, title]) => ({
    number,
    title,
    id: anchorId(number, title),
  })) as LegalSection<Number_>[];

  const byNumber = Object.fromEntries(
    all.map((section) => [section.number, section]),
  ) as Record<Number_, LegalSection<Number_>>;

  return {
    all,
    /** Top-level sections only: what the table of contents lists. */
    sections: all.filter((section) => !section.number.includes(".")),
    get: (number: Number_) => byNumber[number],
  };
}

export type LegalOutline<N extends string = string> = {
  all: LegalSection<N>[];
  sections: LegalSection<N>[];
  get: (number: N) => LegalSection<N>;
};
