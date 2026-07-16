(function () {
  var projects = window.PORTFOLIO_PROJECTS || [];
  var featured = projects.filter(function (p) { return p.featured; });
  var colLeft = document.getElementById('col-left');

  var state = { view: 'home', activeProjectId: null };

  function findProject(id) {
    return projects.filter(function (p) { return p.id === id; })[0];
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : str;
    return div.innerHTML;
  }

  // These 3 fonts are already statically loaded in index.html's <head> —
  // anything else a project's titleFont asks for gets fetched here instead.
  var HOUSE_FONTS = ['Chiron Sung HK', 'Inter', 'Mea Culpa'];

  function loadCustomFonts() {
    var names = [];
    projects.forEach(function (p) {
      if (p.titleFont && HOUSE_FONTS.indexOf(p.titleFont) === -1 && names.indexOf(p.titleFont) === -1) {
        names.push(p.titleFont);
      }
    });
    if (!names.length) return;
    // Request a broad weight/italic range per font — Google Fonts just
    // serves whichever of these the font actually has and ignores the
    // rest, so we don't need to know each font's axis in advance.
    var params = names.map(function (name) {
      return 'family=' + encodeURIComponent(name).replace(/%20/g, '+') +
        ':ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800';
    }).join('&');
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?' + params + '&display=swap';
    document.head.appendChild(link);
  }

  function isVideoSrc(src) {
    return /\.(mp4|webm|mov)(\?.*)?$/i.test(src);
  }

  // Renders a real <img> (or <video> for .mp4/.webm/.mov sources — played
  // back like a looping GIF, no controls/sound) once a source is set (sized
  // by CSS per context — see style.css), or a gray .media-placeholder box
  // while it's still null. `fit: 'cover'` is an explicit per-media opt-in
  // to cropping; everything defaults to fully visible (contain / natural
  // sizing). `extraAttrs` is a raw attribute string for call sites that
  // need e.g. a data-* attribute on the resulting element.
  function mediaBox(src, extraClass, fit, extraAttrs) {
    var cls = (extraClass || '') + (fit === 'cover' ? ' db-fit-cover' : '');
    cls = cls.trim();
    var attrs = extraAttrs ? ' ' + extraAttrs : '';
    if (!src) return '<div class="media-placeholder' + (cls ? ' ' + cls : '') + '"' + attrs + '></div>';
    if (isVideoSrc(src)) {
      return '<video class="' + cls + '"' + attrs + ' src="' + escapeHtml(src) + '" autoplay loop muted playsinline></video>';
    }
    return '<img class="' + cls + '"' + attrs + ' src="' + escapeHtml(src) + '" alt="">';
  }

  // Titles are fully free-form (any font/weight/style/color/size, not a
  // fixed preset) so they're rendered via inline style instead of a CSS
  // class — see loadCustomFonts() below for how non-house fonts get
  // fetched from Google Fonts at runtime.
  function titleInlineStyle(project) {
    var font = project.titleFont || 'Chiron Sung HK';
    var italic = project.titleItalic ? 'italic' : 'normal';
    var weight = project.titleWeight || 400;
    var color = project.titleColor || '#000000';
    var size = project.titleSize || '1.6rem';
    return 'font-family:\'' + escapeHtml(font) + '\', serif; font-style:' + italic +
      '; font-weight:' + weight + '; color:' + escapeHtml(color) +
      '; font-size:' + escapeHtml(size) + '; line-height:1;';
  }

  function renderTitle(project) {
    var html = '';
    if (project.titlePrefix) {
      html += '<span class="project-title-prefix style-' + project.titlePrefix.style + '">' +
        escapeHtml(project.titlePrefix.text) + '</span>';
    }
    html += '<span class="project-title" style="' + titleInlineStyle(project) + '">' +
      escapeHtml(project.title) + '</span>';
    if (project.detail) {
      html += '<span class="project-detail">' +
        '<span class="bracket">[</span>' +
        '<span class="detail-track"><span class="detail-text">' + escapeHtml(project.detail) + '</span></span>' +
        '<span class="bracket">]</span>' +
        '</span>';
    }
    return html;
  }

  function renderHome() {
    var rows = featured.map(function (p) {
      return (
        '<li class="project-row" data-project-id="' + p.id + '">' +
          '<button class="project-row-trigger" type="button" data-action="open-detail" data-project-id="' + p.id + '">' +
            renderTitle(p) +
            '<span class="project-arrow" aria-hidden="true">→</span>' +
          '</button>' +
        '</li>'
      );
    }).join('');

    var previewLayers = featured.map(function (p) {
      return mediaBox(p.previewImage, 'preview-layer', null, 'data-preview-for="' + p.id + '"');
    }).join('');

    return (
      '<p class="caption">Paul Abends, integrated Design and Design Research</p>' +
      '<div class="preview-slot" id="preview-slot">' + previewLayers + '</div>' +
      '<ul class="project-list" id="project-list">' +
        rows +
        '<li class="project-row archive-control">' +
          '<button class="project-row-trigger" type="button" data-action="open-archive">' +
            '<span class="project-title style-plain">Project Archive</span>' +
          '</button>' +
        '</li>' +
      '</ul>'
    );
  }

  // Detail view body blocks — each project supplies its own ordered
  // `detailLayout` array so composition/whitespace can vary per project
  // instead of every Detail view following one fixed template.
  function widthAlignClass(block) {
    var cls = 'db-width-' + (block.width || 'full') + ' db-align-' + (block.align || 'left');
    // Only matters inside a row block (align-self is a no-op elsewhere) —
    // lets a short text sit at the bottom next to a taller image, or
    // vice versa, instead of both defaulting to the row's top edge.
    if (block.valign === 'bottom') cls += ' db-valign-bottom';
    return cls;
  }

  function renderCaption(caption) {
    return caption ? '<p class="db-caption">' + escapeHtml(caption) + '</p>' : '';
  }

  function renderDetailBlock(block) {
    if (block.type === 'image') {
      return (
        '<div class="db db-image ' + widthAlignClass(block) + '">' +
          mediaBox(block.src, '', block.fit) +
          renderCaption(block.caption) +
        '</div>'
      );
    }
    if (block.type === 'imageGrid') {
      var cols = block.columns || 2;
      var cells = block.images.map(function (img) {
        return '<div class="db-grid-cell">' + mediaBox(img.src, '', img.fit) + renderCaption(img.caption) + '</div>';
      }).join('');
      return '<div class="db db-grid" data-columns="' + cols + '">' + cells + '</div>';
    }
    if (block.type === 'text') {
      return (
        '<div class="db db-text ' + widthAlignClass(block) + '">' +
          '<p class="detail-description">' + escapeHtml(block.content) + '</p>' +
        '</div>'
      );
    }
    if (block.type === 'spacer') {
      return '<div class="db db-spacer-' + (block.size || 'md') + '"></div>';
    }
    if (block.type === 'row') {
      var children = (block.blocks || []).map(renderDetailBlock).join('');
      return '<div class="db db-row">' + children + '</div>';
    }
    return '';
  }

  function renderDetail(project) {
    if (!project) return '<button class="back-control" type="button" data-action="go-home">← back</button>';
    var blocks = (project.detailLayout || []).map(renderDetailBlock).join('');
    return (
      '<button class="back-control" type="button" data-action="go-home">← back</button>' +
      '<div class="detail-heading">' + renderTitle(project) + '</div>' +
      '<div class="detail-blocks">' + blocks + '</div>'
    );
  }

  function renderArchive() {
    var rows = projects.map(function (p) {
      var tags = p.tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');
      return (
        '<li class="project-row archive-row" data-project-id="' + p.id + '">' +
          '<button class="project-row-trigger" type="button" data-action="open-detail" data-project-id="' + p.id + '">' +
            renderTitle(p) +
          '</button>' +
          '<div class="accordion">' +
            mediaBox(p.previewImage, 'accordion-media') +
            '<div>' +
              '<p class="accordion-blurb">' + escapeHtml(p.archiveBlurb) + '</p>' +
              '<div class="accordion-tags">' + tags + '</div>' +
            '</div>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    return (
      '<button class="back-control" type="button" data-action="go-home">← back</button>' +
      '<ul class="project-list archive-list" id="project-list">' + rows + '</ul>'
    );
  }

  function render() {
    colLeft.dataset.view = state.view;
    if (state.view === 'detail') {
      colLeft.innerHTML = renderDetail(findProject(state.activeProjectId));
    } else if (state.view === 'archive') {
      colLeft.innerHTML = renderArchive();
    } else {
      colLeft.innerHTML = renderHome();
    }
  }

  function goHome() {
    state.view = 'home';
    state.activeProjectId = null;
    render();
  }

  function openArchive() {
    state.view = 'archive';
    state.activeProjectId = null;
    render();
  }

  function openDetail(id) {
    state.view = 'detail';
    state.activeProjectId = id;
    render();
  }

  // Click delegation — survives re-renders because it's bound on the
  // stable #col-left node, not on the elements that get replaced.
  colLeft.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    var action = trigger.dataset.action;
    if (action === 'open-archive') openArchive();
    else if (action === 'go-home') goHome();
    else if (action === 'open-detail') openDetail(trigger.dataset.projectId);
  });

  // Home hover: swap which placeholder shows in the top preview slot.
  // (The arrow reveal is pure CSS — see .project-row:hover .project-arrow.)
  colLeft.addEventListener('mouseover', function (e) {
    if (state.view !== 'home') return;
    var row = e.target.closest('.project-row[data-project-id]');
    if (!row) return;
    var slot = document.getElementById('preview-slot');
    if (!slot) return;
    var id = row.dataset.projectId;
    slot.querySelectorAll('.preview-layer').forEach(function (el) {
      el.classList.toggle('is-visible', el.dataset.previewFor === id);
    });
  });

  colLeft.addEventListener('mouseout', function (e) {
    if (state.view !== 'home') return;
    var row = e.target.closest('.project-row[data-project-id]');
    if (!row || row.contains(e.relatedTarget)) return;
    var slot = document.getElementById('preview-slot');
    if (!slot) return;
    slot.querySelectorAll('.preview-layer').forEach(function (el) {
      el.classList.remove('is-visible');
    });
  });

  // Outside click closes the detail/archive views back to Home.
  // Capture phase, deliberately: it must evaluate colLeft.contains(e.target)
  // BEFORE colLeft's own bubble-phase click handler (above) can re-render
  // and detach e.target from the DOM — otherwise every click, including
  // ones on the row that just opened the view, would look like an
  // "outside" click once the target node no longer has a parent.
  document.addEventListener('click', function (e) {
    if (state.view === 'home') return;
    if (colLeft.contains(e.target)) return;
    goHome();
  }, true);

  loadCustomFonts();
  render();
})();
