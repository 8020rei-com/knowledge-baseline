(() => {
  'use strict';
  const bank = JSON.parse(document.getElementById('question-data').textContent);
  const ids = new Set(bank.questions.map(q => String(q.id)));
  const storageKey = '8020rei-knowledge-review-' + bank.version + '-share-v1';
  const $ = id => document.getElementById(id);
  const state = { name: '', overall: '', answers: {}, notes: {} };
  let noticeTimer;
  const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object') {
      state.name = text(saved.name, 120);
      state.overall = text(saved.overall, 6000);
      for (const id of ids) {
        const answer = saved.answers?.[id];
        if (['A', 'B', 'C', 'D', 'E'].includes(answer)) state.answers[id] = answer;
        state.notes[id] = text(saved.notes?.[id], 3000);
      }
    }
  } catch {
    $('save-status').textContent = 'This browser could not restore a saved draft. You can still copy or download your review.';
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      $('save-status').textContent = 'Saved in this browser. Copy or download when you are ready to share.';
    } catch {
      $('save-status').textContent = 'Browser saving is unavailable. Copy or download your review before closing.';
    }
  }

  function summary() {
    const completed = Object.keys(state.answers).length;
    const unknown = Object.values(state.answers).filter(a => a === 'E').length;
    const lines = ['8020REI Knowledge Baseline — Answers & feedback', 'Version: ' + bank.version,
      'Reviewer: ' + (state.name.trim() || 'Not provided'),
      'Responses: ' + completed + '/50 (' + unknown + ' marked “I do not know yet”; ' + (50 - completed) + ' unanswered)', ''];
    for (const q of bank.questions) {
      const answer = state.answers[q.id];
      lines.push(q.id + '. ' + q.stem);
      lines.push('Answer: ' + (answer ? answer + '. ' + (answer === 'E' ? 'I do not know yet.' : q.options[answer]) : 'Not answered'));
      if (state.notes[q.id]?.trim()) lines.push('Feedback: ' + state.notes[q.id].trim());
      lines.push('');
    }
    lines.push('Overall feedback:', state.overall.trim() || 'None provided.');
    return lines.join('\n');
  }

  function update() {
    const completed = Object.keys(state.answers).length;
    $('progress-label').textContent = completed + ' of 50 answered';
    $('progress').value = completed;
    for (const id of ids) $('note-indicator-' + id).textContent = state.notes[id]?.trim() ? '· Feedback added' : '';
    if ($('summary-panel').open) $('response-summary').value = summary();
  }

  function notify(message) {
    $('copy-status').textContent = message;
    $('copy-notice').textContent = message;
    $('copy-notice').hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { $('copy-notice').hidden = true; }, 6500);
  }

  async function copy() {
    const output = summary();
    $('response-summary').value = output;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(output);
      notify('Copied. Paste your answers and feedback into a message to Ignacio.');
    } catch {
      $('summary-panel').open = true;
      $('response-summary').focus();
      $('response-summary').select();
      $('response-summary').scrollIntoView({ block: 'center' });
      notify('Select and copy the summary below, or use “Download as text.”');
    }
  }

  $('reviewer').value = state.name;
  $('overall').value = state.overall;
  for (const id of ids) {
    const answer = state.answers[id];
    if (answer) document.querySelector('input[name="q' + id + '"][value="' + answer + '"]').checked = true;
    $('note-' + id).value = state.notes[id] || '';
  }
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.matches('input[type="radio"]')) {
      const id = input.name.slice(1);
      if (ids.has(id) && ['A', 'B', 'C', 'D', 'E'].includes(input.value)) {
        state.answers[id] = input.value;
        update(); save();
      }
    }
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'reviewer') state.name = input.value;
    else if (input.id === 'overall') state.overall = input.value;
    else if (input.dataset.note && ids.has(input.dataset.note)) state.notes[input.dataset.note] = input.value;
    else return;
    update(); save();
  });
  $('jump-topic').addEventListener('change', event => {
    const section = $(event.target.value);
    if (!section) return;
    section.scrollIntoView({ block: 'start' });
    const heading = section.querySelector('h2');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', copy));
  $('summary-panel').addEventListener('toggle', () => {
    if ($('summary-panel').open) $('response-summary').value = summary();
  });
  $('download').addEventListener('click', () => {
    const blob = new Blob([summary()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '8020REI-review-' + bank.version + '.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify('Downloaded. Attach the text file to a message to Ignacio.');
  });
  update();
})();
