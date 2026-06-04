const STAGES = ["PLAN", "SEARCH", "FILTER", "ANALYZE", "VERIFY", "OUTPUT"];

const state = {
  meta: null,
  eventSource: null,
  currentStageIndex: -1,
};

const form = document.getElementById("digest-form");
const divisionSelect = document.getElementById("division");
const topicSelect = document.getElementById("topic");
const periodSelect = document.getElementById("period");
const commentInput = document.getElementById("comment");
const submitButton = document.getElementById("submit-button");
const stageList = document.getElementById("stage-list");
const progressStage = document.getElementById("progress-stage");
const progressBadge = document.getElementById("progress-badge");
const progressBar = document.getElementById("progress-bar");
const resultCard = document.getElementById("result-card");
const digestOutput = document.getElementById("digest-output");

async function bootstrap() {
  const response = await fetch("/api/meta");
  state.meta = await response.json();
  populateDivisions();
  populatePeriods();
  syncTopics();
  renderStageList();
}

function populateDivisions() {
  const divisions = Object.keys(state.meta.divisions);
  divisionSelect.innerHTML = divisions
    .map((division) => `<option value="${escapeHtml(division)}">${escapeHtml(division)}</option>`)
    .join("");
}

function populatePeriods() {
  periodSelect.innerHTML = Object.entries(state.meta.periods)
    .map(
      ([value, data]) =>
        `<option value="${value}">${escapeHtml(data.label)}</option>`
    )
    .join("");
  periodSelect.value = "7d";
}

function syncTopics() {
  const topics = state.meta.divisions[divisionSelect.value] || [];
  topicSelect.innerHTML = topics
    .map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`)
    .join("");
}

function renderStageList(activeStage = null, completed = []) {
  stageList.innerHTML = STAGES.map((stage, index) => {
    const done = completed.includes(stage);
    const active = stage === activeStage;
    const statusText = done ? "Готово" : active ? "В работе" : "Ожидание";
    return `
      <div class="stage-item ${active ? "is-active" : ""} ${done ? "is-done" : ""}">
        <div class="stage-top">
          <span class="stage-name">${stage}</span>
          <span class="stage-state">${statusText}</span>
        </div>
        <p>${stageDescription(stage, index)}</p>
      </div>
    `;
  }).join("");
}

function stageDescription(stage) {
  const descriptions = {
    PLAN: "Формирование стратегии поиска, запросов и пула доверенных источников.",
    SEARCH: "Сбор материалов из новостных сайтов, RSS и публичных Telegram-каналов.",
    FILTER: "Удаление дублей, слабых сигналов и сомнительных публикаций.",
    ANALYZE: "Выделение ключевого вывода и приоритизация событий.",
    VERIFY: "Контроль периода, ссылок и достоверности выбранных материалов.",
    OUTPUT: "Подготовка финального дайджеста в деловом формате.",
  };
  return descriptions[stage] || "";
}

function updateProgress(stage, message) {
  const stageIndex = STAGES.indexOf(stage);
  state.currentStageIndex = stageIndex;
  const completed = STAGES.slice(0, Math.max(stageIndex, 0));
  renderStageList(stage, completed);
  progressStage.textContent = message || stage;
  progressBadge.textContent = `${Math.max(stageIndex + 1, 0)} / ${STAGES.length}`;
  progressBar.style.width = `${((stageIndex + 1) / STAGES.length) * 100}%`;
}

async function submitForm(event) {
  event.preventDefault();
  resetResult();

  const payload = {
    division: divisionSelect.value,
    topic: topicSelect.value,
    period: periodSelect.value,
    comment: commentInput.value.trim(),
  };

  submitButton.disabled = true;
  updateProgress("PLAN", "Запускаю агентный цикл.");

  const response = await fetch("/api/digest/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    showError("Не удалось запустить генерацию дайджеста.");
    submitButton.disabled = false;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";
    chunks.forEach(handleSseChunk);
  }

  submitButton.disabled = false;
}

function handleSseChunk(chunk) {
  const line = chunk
    .split("\n")
    .find((entry) => entry.startsWith("data: "));

  if (!line) {
    return;
  }

  const payload = JSON.parse(line.replace("data: ", ""));
  if (payload.type === "error") {
    showError(payload.message);
    submitButton.disabled = false;
    return;
  }

  if (payload.stage) {
    updateProgress(payload.stage, payload.message);
  }

  if (payload.type === "result") {
    renderDigest(payload.digest);
  }
}

function renderDigest(markdown) {
  resultCard.classList.remove("is-empty");
  digestOutput.innerHTML = markdownToHtml(markdown);
}

function resetResult() {
  resultCard.classList.add("is-empty");
  digestOutput.innerHTML = "";
  renderStageList();
  progressStage.textContent = "Подготовка к запуску";
  progressBadge.textContent = `0 / ${STAGES.length}`;
  progressBar.style.width = "0%";
}

function showError(message) {
  resultCard.classList.remove("is-empty");
  digestOutput.innerHTML = `<p><strong>Ошибка:</strong> ${escapeHtml(message)}</p>`;
  progressStage.textContent = "Генерация прервана";
}

function markdownToHtml(markdown) {
  let html = escapeHtml(markdown);
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^\*([^*]+)\*$/gm, "<p><em>$1</em></p>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/---/g, "<hr />");
  html = wrapLists(html);
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^<h\d|^<ul|^<ol|^<hr/.test(block.trim())) {
        return block;
      }
      return `<p>${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
  return html;
}

function wrapLists(html) {
  html = html.replace(/(?:<li>.*?<\/li>\s*)+/gs, (match) => `<ul>${match}</ul>`);
  return html;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

divisionSelect.addEventListener("change", syncTopics);
form.addEventListener("submit", submitForm);

bootstrap().catch(() => {
  showError("Не удалось загрузить конфигурацию интерфейса.");
});
