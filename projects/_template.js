// HOW TO ADD A NEW PROJECT
// 1. Copy this file into projects/ and rename it (e.g. projects/my-new-project.js)
// 2. Fill in the fields below
// 3. Add one line to index.html, right after the other project <script> tags:
//      <script src="projects/my-new-project.js"></script>
// That's it — the project will automatically show up in the home list (if
// featured: true) and/or the archive.

window.PORTFOLIO_PROJECTS.push({
  // Unique id, lowercase, hyphenated. Used internally to track which
  // project is open — never shown to visitors.
  id: 'my-new-project',

  // true  -> shows as a row in the home list (left column, default view)
  // false -> only appears in the Project Archive view
  featured: true,

  // Optional short prefix shown before the title, e.g. "(Affective)" or
  // "Leo Kaminski". Set to null if the project has no prefix.
  titlePrefix: {
    text: '(Affective)',
    style: 'italic', // 'italic' or 'plain'
  }, // or: titlePrefix: null,

  // The project title as shown in the list and in the detail view.
  title: 'My New Project',

  // Title styling is fully free-form — five independent fields instead of
  // a fixed preset:
  titleFont: 'Chiron Sung HK',   // any font name — the site's own 3 fonts
                                 // (Chiron Sung HK, Inter, Mea Culpa) are
                                 // already loaded; type in ANY OTHER Google
                                 // Fonts family name (e.g. 'Space Mono',
                                 // 'Playfair Display') and it's fetched
                                 // automatically at runtime, no extra setup
  titleItalic: false,           // true | false
  titleWeight: 400,             // 100-900 (Google Fonts weight scale) —
                                 // only takes effect if the chosen font
                                 // actually ships that weight; otherwise
                                 // the browser silently falls back
  titleColor: '#000000',        // any CSS color (hex/rgb/named)
  titleSize: '1.6rem',          // any CSS length — e.g. Stahlbeton's giant
                                 // script title uses '4rem' here

  // Text rendered inside the square brackets after the title, e.g.
  // "installation, 2025". Set to null to hide the bracket entirely
  // (used by "Project Archive").
  detail: 'medium, year',

  // Short one/two-line blurb shown in the Archive view's hover accordion.
  // Can be the same as the start of `description` or a shorter summary.
  archiveBlurb: 'A short teaser sentence shown when this row is hovered in the archive list.',

  // Tags shown as small pills in the Archive view's hover accordion.
  tags: ['tag one', 'tag two'],

  // Shown in the home hover-preview slot AND the Archive view's hover
  // accordion. Leave null to render a gray placeholder box instead (fine
  // until you have a real photo/GIF/video). Once you have a real file,
  // drop it somewhere under img/ and point this at that path, e.g.
  // 'img/my-project-preview.jpg'. A .mp4/.webm/.mov file plays back
  // muted and looping, like a GIF — prefer video over GIF where possible,
  // it's dramatically smaller for the same motion content.
  previewImage: null,

  // The Detail view's body (everything below the title heading) is a
  // list of blocks, rendered top to bottom in the order you write them.
  // Mix and match freely — this is what lets each project's Detail view
  // look different from the others instead of following one fixed
  // template. Available block types:
  //
  //   { type: 'image', src, width, align, valign, fit, caption }
  //     src: a photo/GIF path, or a .mp4/.webm/.mov — video plays back
  //          muted and looping like a GIF, but is much smaller for the
  //          same amount of motion, so prefer it over GIF where you can
  //     width: 'full' | 'large' | 'medium' | 'small' (100/75/50/33%)
  //     align: 'left' | 'center' | 'right' — only matters when width isn't
  //            'full'; that's what leaves deliberate whitespace beside it
  //     valign: 'top' (default) | 'bottom' — only matters inside a `row`
  //             block, where the two children can be different heights;
  //             pins this one to the bottom of the row instead of the top
  //     fit: 'contain' (default, image always fully visible, own aspect
  //          ratio) | 'cover' (crops to a fixed 4:3 box — opt in only when
  //          you want a uniform tile look, e.g. in an imageGrid)
  //     caption: optional small italic line under the image, or null
  //
  //   { type: 'imageGrid', columns: 2 | 3, images: [{ src, fit?, caption? }, ...] }
  //     each image in the grid gets its own optional `fit`, same as above
  //
  //   { type: 'text', content, width, align, valign } — same width/align/
  //     valign as image
  //
  //   { type: 'spacer', size: 'sm' | 'md' | 'lg' | 'block' }
  //     explicit vertical whitespace between blocks, on the site's
  //     existing spacing scale (see --gap-* in css/style.css)
  //
  //   { type: 'row', blocks: [ ...2+ image/text blocks... ] }
  //     lays its children out side by side instead of stacked — use this
  //     when e.g. a narrow left-aligned image should sit next to a narrow
  //     right-aligned text instead of each getting its own full-width row.
  //     Only image/text belong inside a row (no nested rows/spacers).
  //
  // Every `src` can be left null for a placeholder box, same as previewImage.
  detailLayout: [
    { type: 'image', src: null, width: 'full', align: 'left', fit: 'contain', caption: null },
    { type: 'text', content: 'The full project description shown on the detail page.', width: 'full', align: 'left' },
    { type: 'spacer', size: 'lg' },
    { type: 'imageGrid', columns: 2, images: [{ src: null }, { src: null }] },
    { type: 'spacer', size: 'lg' },
    {
      type: 'row',
      blocks: [
        { type: 'image', src: null, width: 'medium', align: 'left', fit: 'contain', caption: null },
        { type: 'text', content: 'A shorter note that sits beside the image instead of below it.', width: 'medium', align: 'right' },
      ],
    },
  ],
});
