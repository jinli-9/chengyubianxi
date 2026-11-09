/* ============ 例句选词填空（数据：人民网 / 人民日报检索句） ============ */
let CZ = { list: [], i: 0, right: 0, picks: {}, done: false, scope: 'all' };

function buildCloze(){
  const out = [];
  (CLOZE.cloze || CLOZE.groups || []).forEach(g => {
    const items = [];
    g.words.forEach(w => {
      (g.eg[w] || []).forEach(c => items.push({ w, c, g }));
    });
    if (items.length < 2) return;
    const pick = shuffle(items.slice()).slice(0, Math.min(3, items.length));
    pick.forEach(it => {
      // 干扰项必须同组（近义）
      const opts = g.words.slice();
      if (!opts.includes(it.w)) opts.push(it.w);
      if (opts.length < 2) return;
      const seg = it.c.s;
      if (seg.split(it.w).length - 1 < 1) return;
      out.push({ seg, ans: it.w, opts: shuffle(opts.slice()).slice(0, Math.min(4, opts.length)), group: g, src: it.c.src, title: it.c.t });
    });
  });
  return shuffle(out);
}

function initCloze(){
  if (!CZ.list.length || CZ.i >= CZ.list.length){
    CZ = { list: buildCloze(), i: 0, right: 0, picks: {}, done: false, scope: 'all' };
  }
  drawCloze();
}

function drawCloze(){
  const box = $('#cloze');
  if (!CZ.list.length){
    box.innerHTML = `<div class="empty"><b>暂无可用的填空题</b>例句数据加载中</div>`;
    return;
  }
  if (CZ.i >= CZ.list.length){
    const pct = Math.round(CZ.right / CZ.list.length * 100);
    box.innerHTML = `<div class="cz-card" style="text-align:center;padding:48px 28px">
      <div style="font-size:13px;color:var(--ink3);letter-spacing:.6px">本轮完成</div>
      <div style="font-size:46px;font-weight:700;letter-spacing:-1px;margin:10px 0">${pct}<span style="font-size:20px">%</span></div>
      <div style="color:var(--ink2);font-size:14px;margin-bottom:22px">语境判断正确 ${CZ.right} / ${CZ.list.length} 题</div>
      <button class="btn primary" style="max-width:230px;margin:0 auto" id="cz-again">再来一组</button>
    </div>`;
    $('#cz-again').onclick = () => { CZ.list = []; initCloze(); };
    return;
  }
  const q = CZ.list[CZ.i];
  CZ.picks = {};
  CZ.done = false;
  const masked = q.seg.replace(q.ans, '__BLANK__');
  const html = esc(masked).split('__BLANK__').join('<span class="fld" id="cz-fld">　</span>');
  box.innerHTML = `<div class="cz-top">
      <span>语境选词 · 第 ${CZ.i + 1} / ${CZ.list.length} 题</span>
      <span>同组词：<b style="color:var(--ink)">${q.group.words.join(' / ')}</b></span>
    </div>
    <div class="cz-card">
      <div class="cz-passage">${html}</div>
      <div class="cz-group">
        <h4>从下面这组近义词中选出最贴合语境的一个</h4>
        <div class="cz-opts" id="cz-opts">${q.opts.map(w => `<button class="cz-opt" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
      </div>
      <div class="cz-actions">
        <button class="btn primary" style="flex:0 0 auto;padding:9px 22px" id="cz-check">确认选择</button>
        <button class="btn" style="flex:0 0 auto;padding:9px 18px" id="cz-skip">看答案</button>
        <span class="cz-src">例句来源：${esc(q.src || '人民网')}${q.title ? '《' + esc(q.title) + '》' : ''}</span>
      </div>
      <div class="cz-res" id="cz-res"></div>
    </div>`;
  box.querySelectorAll('.cz-opt').forEach(b => b.onclick = () => {
    if (CZ.done) return;
    box.querySelectorAll('.cz-opt').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    CZ.picks.pick = b.dataset.w;
    const fld = $('#cz-fld');
    fld.textContent = b.dataset.w;
    fld.classList.add('filled');
  });
  $('#cz-check').onclick = () => judgeCloze(q, false);
  $('#cz-skip').onclick = () => judgeCloze(q, true);
}

function judgeCloze(q, skip){
  if (CZ.done) return;
  const pick = CZ.picks.pick;
  if (!pick && !skip) { return; }
  CZ.done = true;
  const ok = pick === q.ans;
  if (ok) CZ.right++;
  const box = $('#cloze');
  const fld = $('#cz-fld');
  fld.textContent = q.ans;
  fld.classList.add('filled');
  fld.style.color = ok ? '#2f6a4b' : 'var(--accent)';
  fld.style.borderColor = ok ? '#8cbf9f' : '#e0a99a';
  box.querySelectorAll('.cz-opt').forEach(b => {
    if (b.dataset.w === q.ans) b.classList.add('right');
    else if (b.dataset.w === pick) b.classList.add('wrong');
    else b.classList.add('used');
  });
  // 找该词的核心差异
  const row = (D.groups.find(g => g.words.join() === q.group.words.join()) || {}).rows?.find(r => r.w === q.ans) || {};
  const others = q.group.words.filter(w => w !== q.ans);
  const res = $('#cz-res');
  res.classList.add('on');
  res.innerHTML = `<div style="font-size:13.5px;margin-bottom:10px">${skip ? '💡 正确答案是' : (ok ? '✅ 正确' : '❌ 应为')}<b style="color:var(--accent);margin-left:6px">${esc(q.ans)}</b>　${row.dim ? `<span class="dim">${esc(row.dim)}</span>` : ''}</div>
    ${row.key ? `<div style="margin-bottom:10px;color:var(--ink)">${esc(row.key)}</div>` : ''}
    ${others.length ? `<div style="font-size:12.5px;color:var(--ink2);margin-bottom:12px">同组易混：${others.map(w => {
      const r2 = (D.groups.find(g => g.words.join() === q.group.words.join()) || {}).rows?.find(r => r.w === w) || {};
      return `<div class="egli" style="margin-top:6px"><b style="color:var(--ink)">${esc(w)}</b>　${esc(r2.key || '')}</div>`;
    }).join('')}</div>` : ''}
    <button class="btn primary" style="margin-top:6px;max-width:200px" id="cz-next">下一题 →</button>`;
  $('#cz-next').onclick = () => { CZ.i++; drawCloze(); };
}

/* 补充：在辨析组详情中展示「人民网例句」按钮时使用同一数据源 */
