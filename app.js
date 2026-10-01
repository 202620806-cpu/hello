const STORAGE_KEY = 'bugigo_posts';
const CATS = {
  life: { name: '학교생활' },
  practice: { name: '실습팁' },
  senior: { name: '선배에게 질문' },
  free: { name: '자유게시판' },
  mech: { name: '기계시스템과' },
  equip: { name: '설비시스템과' },
  elec: { name: '전기과' },
  smart: { name: '스마트팩토리과' }
};

const SAMPLE = [
  {
    id: 1, cat: 'practice', grade: '3학년', nick: '베어링장인', title: 'NC선반 실습 팁 - 공구 예열 꼭 하세요',
    body: 'NC선반 실습할 때 바로 절삭 들어가지 말고 5분 정도 공회전으로 기계 예열 먼저 하세요.\n겨울철엔 특히 공차가 달라져서 가공 치수가 흔들립니다.\n그리고 절삭유 확인 습관 들이면 공구 수명 두 배 갑니다!',
    date: new Date(Date.now() - 86400000 * 2).toISOString(), likes: 12, liked: false, comments: [
      { nick: '새내기', body: '오 감사합니다! 내일 실습인데 도움되겠어요', date: new Date(Date.now() - 86400000).toISOString() }
    ]
  },
  {
    id: 2, cat: 'life', grade: '졸업생', nick: '취준중인선배', title: '후배들에게 - 자격증은 미리미리',
    body: '졸업하고 나서 제일 후회한 건 자격증을 늦게 딴 거예요.\n컴퓨터응용기계제도기능사, CNC선반기능사 이런 건 재학 중에 따두면 취업할 때 진짜 큰 무기입니다.\n특기사 관련해서 궁금한 거 있으면 댓글 달아주세요!',
    date: new Date(Date.now() - 86400000 * 5).toISOString(), likes: 25, liked: false, comments: []
  },
  {
    id: 3, cat: 'senior', grade: '1학년', nick: '기계초보', title: '제도 실습에서 도면 읽는 게 너무 어려워요',
    body: '단면도랑 전개도가 헷갈려요. 선배들은 어떻게 빨리 읽었나요? 공부법 알려주세요!',
    date: new Date().toISOString(), likes: 4, liked: false, comments: [
      { nick: '3학년선배', body: '일단 정투영 개념부터 확실히 잡으세요. 교과서 그림 보고 직접 종이접어서 만들어보는 게 제일 빨라요', date: new Date().toISOString() }
    ]
  }
];

let posts = load();
let currentCat = 'all';
let currentSort = 'latest';
let deptFilter = 'all';
let currentDetailId = null;
let pendingImage = null;
let searchQuery = '';

// 비방·비속어 필터 단어 목록
const BAD_WORDS = ['시발', '씨발', '좆', '병신', '지랄', '개새끼', '새끼', '존나', '니미', 'fuck', '바보', '멍청이', '등신', '닥쳐', '꺼져', '뒈져', '돌아이', '머저리', '임마', '빈수레', '싸가지'];

function containsBadWord(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.find(w => lower.includes(w.toLowerCase()));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return SAMPLE;
}

// 이전 버전 호환: 학과가 카테고리로 저장된 글 변환
const DEPT_KEYS = ['mech', 'equip', 'elec', 'smart'];
posts.forEach(p => {
  if (DEPT_KEYS.includes(p.cat)) {
    p.dept = p.cat;
    p.cat = 'free';
  }
});
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

function render() {
  let list = searchQuery
    ? posts.slice()
    : posts.filter(p => currentCat === 'all' || p.cat === currentCat);
  if (!searchQuery && deptFilter !== 'all') {
    list = list.filter(p => p.dept === deptFilter);
  }
  if (searchQuery) {
    const query = searchQuery.normalize('NFKC').toLocaleLowerCase();
    list = list.filter(p => {
      const searchable = [p.title, p.body, p.nick, CATS[p.cat]?.name, p.dept ? CATS[p.dept]?.name : '']
        .filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }
  if (currentSort === 'latest') {
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else {
    list.sort((a, b) => (b.likes + b.comments.length) - (a.likes + a.comments.length));
  }
  const el = document.getElementById('postList');
  el.innerHTML = '';
  document.getElementById('emptyMsg').hidden = list.length > 0;
  document.getElementById('emptyMsg').textContent = searchQuery
    ? '검색 결과가 없습니다. 다른 검색어로 다시 찾아보세요.'
    : '아직 글이 없습니다. 첫 글의 주인공이 되어보세요! 🛠️';
  const count = document.getElementById('postCount');
  count.textContent = searchQuery ? `검색 결과 ${list.length}개` : `${list.length}개`;
  count.classList.toggle('search-count', !!searchQuery);
  document.getElementById('boardTitle').textContent = searchQuery
    ? `“${searchQuery}” 검색 결과`
    : (currentCat === 'all' ? '전체 글' : CATS[currentCat].name) +
      (deptFilter !== 'all' ? ` · ${CATS[deptFilter].name}` : '');

  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-top">
        <span class="badge ${p.cat}">${CATS[p.cat].name}</span>
        ${p.dept ? `<span class="badge ${p.dept}">${CATS[p.dept].name}</span>` : ''}
        <span class="badge grade">${p.grade}</span>
      </div>
      <div class="post-title">${escapeHtml(p.title)}</div>
      <div class="post-preview">${escapeHtml(p.body.split('\n')[0])}</div>
      <div class="post-info">
        <span>👤 ${escapeHtml(p.nick)}</span>
        <span>🕒 ${timeAgo(p.date)}</span>
        <span>👍 ${p.likes}</span>
        <span>💬 ${p.comments.length}</span>
      </div>`;
    card.addEventListener('click', () => openDetail(p.id));
    el.appendChild(card);
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function openDetail(id) {
  const p = posts.find(x => x.id === id);
  if (!p) return;
  currentDetailId = id;
  document.getElementById('dTitle').textContent = p.title;
  const badge = document.getElementById('dBadge');
  badge.textContent = CATS[p.cat].name;
  badge.className = 'badge ' + p.cat;
  let meta = `${p.grade} · ${p.nick}`;
  if (p.dept) meta += ` · ${CATS[p.dept].name}`;
  document.getElementById('dNick').textContent = meta;
  document.getElementById('dDate').textContent = timeAgo(p.date);
  document.getElementById('dBody').textContent = p.body;
  const img = document.getElementById('dImage');
  if (p.image) { img.src = p.image; img.hidden = false; } else { img.hidden = true; }
  document.getElementById('likeCount').textContent = p.likes;
  document.getElementById('likeBtn').classList.toggle('liked', !!p.liked);
  renderComments(p);
  document.getElementById('detailModal').hidden = false;
}

function renderComments(p) {
  document.getElementById('cCount').textContent = p.comments.length;
  const list = document.getElementById('commentList');
  list.innerHTML = '';
  if (p.comments.length === 0) {
    list.innerHTML = '<div class="comment" style="color:var(--muted)">첫 댓글을 달아보세요</div>';
  }
  p.comments.forEach(c => {
    const d = document.createElement('div');
    d.className = 'comment';
    d.innerHTML = `<span class="c-nick">${escapeHtml(c.nick)}</span>${escapeHtml(c.body)}<span class="c-date">${timeAgo(c.date)}</span>`;
    list.appendChild(d);
  });
}

// 이벤트
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    resetSearch();
    document.querySelectorAll('.nav-link').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    currentCat = a.dataset.cat;
    document.getElementById('deptBar').hidden = false;
    render();
  });
});

document.querySelectorAll('.dept-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    resetSearch();
    document.querySelectorAll('.dept-btn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    deptFilter = btn.dataset.dept;
    render();
  });
});

document.getElementById('sortSelect').addEventListener('change', e => {
  currentSort = e.target.value;
  render();
});

function applySearch() {
  searchQuery = document.getElementById('searchInput').value.trim().replace(/\s+/g, ' ');
  if (searchQuery) {
    currentCat = 'all';
    deptFilter = 'all';
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.cat === 'all'));
    document.querySelectorAll('.dept-btn').forEach(button => button.classList.toggle('active', button.dataset.dept === 'all'));
  }
  document.getElementById('clearSearch').hidden = !searchQuery;
  render();
}

function resetSearch() {
  searchQuery = '';
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').hidden = true;
}

document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  applySearch();
  document.getElementById('boardHeader').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('searchInput').addEventListener('input', applySearch);
document.getElementById('clearSearch').addEventListener('click', () => {
  resetSearch();
  render();
  document.getElementById('searchInput').focus();
});

document.getElementById('sideWriteBtn').addEventListener('click', () => {
  document.getElementById('newPostBtn').click();
});
document.getElementById('sideAllLink').addEventListener('click', e => {
  e.preventDefault();
  document.querySelector('.nav-link[data-cat="all"]').click();
});
document.getElementById('sideSeniorLink').addEventListener('click', e => {
  e.preventDefault();
  document.querySelector('.nav-link[data-cat="senior"]').click();
});
document.getElementById('deptMoreBtn').addEventListener('click', () => {
  document.getElementById('deptBar').hidden = false;
  document.getElementById('deptBar').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

document.getElementById('newPostBtn').addEventListener('click', () => {
  document.getElementById('modal').hidden = false;
  document.getElementById('postNick').value = localStorage.getItem('bugigo_nick') || '';
});
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').hidden = true;
});
document.getElementById('closeDetail').addEventListener('click', () => {
  document.getElementById('detailModal').hidden = true;
});

document.getElementById('postImage').addEventListener('change', e => {
  const file = e.target.files[0];
  pendingImage = null;
  document.getElementById('imagePreview').hidden = true;
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('이미지 용량이 너무 큽니다. 5MB 이하 이미지를 사용해주세요.');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      // 용량 절약을 위해 최대 900px 너비로 리사이즈
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      pendingImage = canvas.toDataURL('image/jpeg', 0.8);
      const preview = document.getElementById('imagePreview');
      preview.src = pendingImage;
      preview.hidden = false;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

document.getElementById('postForm').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('postTitle').value;
  const body = document.getElementById('postBody').value;

  const bad = containsBadWord(title) || containsBadWord(body);
  if (bad) {
    alert(`⚠️ 등록이 제한되었습니다.\n비속어나 비방 표현("${bad}")이 포함되어 있습니다.\n건전한 표현으로 수정해주세요.`);
    return;
  }
  if (!confirm('⚠️ 게시 전 확인!\n\n비방·모욕·비속어가 포함된 글은 등록이 제한될 수 있으며,\n부적절한 게시물은 관리자에 의해 삭제될 수 있습니다.\n\n위 내용에 동의하고 게시하시겠습니까?')) {
    return;
  }

  posts.unshift({
    id: Date.now(),
    cat: document.getElementById('postCat').value,
    dept: document.getElementById('postDept').value,
    grade: document.getElementById('postGrade').value,
    nick: document.getElementById('postNick').value.trim(),
    title: title.trim(),
    body: body.trim(),
    image: pendingImage,
    date: new Date().toISOString(),
    likes: 0, liked: false, comments: []
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (err) {
    alert('저장 공간이 부족합니다. 첨부 이미지 없이 다시 시도해주세요.');
    posts.shift();
    return;
  }
  localStorage.setItem('bugigo_nick', document.getElementById('postNick').value.trim());
  e.target.reset();
  pendingImage = null;
  document.getElementById('imagePreview').hidden = true;
  document.getElementById('modal').hidden = true;
  render();
});

document.getElementById('likeBtn').addEventListener('click', () => {
  const p = posts.find(x => x.id === currentDetailId);
  if (!p) return;
  p.liked = !p.liked;
  p.likes += p.liked ? 1 : -1;
  save();
  document.getElementById('likeCount').textContent = p.likes;
  document.getElementById('likeBtn').classList.toggle('liked', p.liked);
  render();
});

document.getElementById('commentForm').addEventListener('submit', e => {
  e.preventDefault();
  const p = posts.find(x => x.id === currentDetailId);
  if (!p) return;
  p.comments.push({
    nick: document.getElementById('cNick').value.trim(),
    body: document.getElementById('cBody').value.trim(),
    date: new Date().toISOString()
  });
  save();
  e.target.reset();
  renderComments(p);
  render();
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  const p = posts.find(x => x.id === currentDetailId);
  if (!p) return;
  const pw = prompt('글 비밀번호를 입력하세요');
  if (pw === null) return;
  // 샘플글/비번 확인 없이 삭제 허용 (localStorage 기반 데모)
  if (confirm('정말 삭제하시겠습니까?')) {
    posts = posts.filter(x => x.id !== currentDetailId);
    save();
    document.getElementById('detailModal').hidden = true;
    render();
  }
});

render();
