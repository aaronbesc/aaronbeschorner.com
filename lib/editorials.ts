// The editorials on the styling page, in the order of the magazine's index,
// with each title in its color there.

/** One magazine page, or two that together form a spread. */
export type Shot = string[];

export type Editorial = {
  title: string;
  color: string;
  /** Rows of shots on wide screens; each row fills the width. */
  rows: Shot[][];
};

const pages = (dir: string, ...files: string[]) =>
  files.map((file) => `/images/strike/${dir}/${file}.jpg`);

export const EDITORIALS: Editorial[] = [
  {
    title: "VISAGE",
    color: "#ee1d23",
    rows: [
      [pages("visage", "descarga_6", "descarga_7"), pages("visage", "descarga_8", "descarga_9")],
      [pages("visage", "descarga_11", "descarga_1"), pages("visage", "descarga_10")],
    ],
  },
  {
    title: "MOD",
    color: "#e193ce",
    rows: [[pages("mod", "descarga_13"), pages("mod", "descarga_14")]],
  },
  {
    title: "POSSE",
    color: "#ef509a",
    rows: [[pages("posse", "descarga_15", "descarga_16")]],
  },
  {
    title: "SPORT",
    color: "#0160ac",
    rows: [
      [pages("sport", "descarga_4", "descarga_5")],
      [pages("sport", "descarga"), pages("sport", "descarga_3"), pages("sport", "descarga_2")],
    ],
  },
];

/** Every page of an editorial, in order. */
export const pagesOf = (editorial: Editorial) => editorial.rows.flat(2);
