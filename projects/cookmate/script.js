const recipe = [
  {
    title: "准备食材",
    prompt: "准备两个鸡蛋和一个番茄，洗手后说继续。",
    duration: null
  },
  {
    title: "切番茄",
    prompt: "把番茄切成八瓣，切完说继续。",
    duration: 120
  },
  {
    title: "打散鸡蛋",
    prompt: "把鸡蛋打散，看不到大片蛋清后说继续。",
    duration: null
  },
  {
    title: "热锅",
    prompt: "由你操作炉具，锅热后倒油；设备不控制火候。",
    duration: 30
  },
  {
    title: "炒鸡蛋",
    prompt: "把蛋液倒入锅中，轻轻推动；完成后说继续。",
    duration: 60
  },
  {
    title: "合炒出锅",
    prompt: "加入番茄翻炒并调味，盛出后说完成。",
    duration: 60
  }
];

const state = {
  index: 1,
  seconds: recipe[1].duration,
  paused: false,
  completed: false,
  zone: "切配区",
  lastCaption: "我在等你说“继续”。"
};

const stepLabel = document.querySelector("#step-label");
const stepTitle = document.querySelector("#step-title");
const stepPrompt = document.querySelector("#step-prompt");
const timerValue = document.querySelector("#timer-value");
const timerRing = document.querySelector("#timer-ring");
const progressBar = document.querySelector("#progress-bar");
const caption = document.querySelector("#demo-caption");
const cameraState = document.querySelector("#camera-state");
const audioState = document.querySelector("#audio-state");
const pauseState = document.querySelector("#pause-state");
const buttons = document.querySelectorAll("[data-action]");

function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return "--:--";
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

function setCaption(text) {
  state.lastCaption = text;
  caption.textContent = text;
}

function render() {
  const step = recipe[state.index];
  const duration = step.duration;
  stepLabel.textContent = state.completed ? "流程完成" : `第 ${state.index + 1} 步 / ${recipe.length}`;
  stepTitle.textContent = state.completed ? "番茄炒蛋" : step.title;
  stepPrompt.textContent = state.completed ? "本次前端状态模拟完成。实体装配与 RDK 联调尚未完成。" : step.prompt;
  timerValue.textContent = state.completed ? "DONE" : formatTime(state.seconds);
  progressBar.style.width = `${((state.completed ? recipe.length : state.index + 1) / recipe.length) * 100}%`;

  const progress = duration ? Math.max(0, Math.min(100, (state.seconds / duration) * 100)) : 100;
  timerRing.style.setProperty("--progress", state.completed ? 100 : progress);
  timerRing.setAttribute("aria-label", state.completed ? "完成" : duration ? `剩余 ${formatTime(state.seconds)}` : "本步骤无计时");

  cameraState.textContent = `相机：${state.paused ? "回中" : state.zone}`;
  audioState.textContent = state.paused ? "麦克风：停" : "麦克风：听";
  pauseState.textContent = state.completed ? "完成" : state.paused ? "已暂停" : "运行中";
  caption.textContent = state.lastCaption;
}

function nextStep() {
  if (state.completed) {
    setCaption("本次模拟已经完成，可以重新开始。");
    render();
    return;
  }
  if (state.paused) {
    setCaption("当前已暂停。先恢复，再提交当前步骤。");
    render();
    return;
  }
  if (state.index >= recipe.length - 1) {
    state.completed = true;
    state.zone = "回中";
    setCaption("完成。共 6 步；实际用时由用户确认。");
  } else {
    state.index += 1;
    state.seconds = recipe[state.index].duration;
    setCaption(`已进入第 ${state.index + 1} 步。`);
  }
  render();
}

function repeatStep() {
  setCaption(state.completed ? "流程已完成。" : `重复：${recipe[state.index].prompt}`);
  render();
}

function togglePause() {
  if (state.completed) {
    setCaption("流程已经完成。");
  } else {
    state.paused = !state.paused;
    setCaption(state.paused ? "暂停：计时冻结、语音停止、相机云台回中。" : "恢复：回到暂停前步骤。");
  }
  render();
}

function remainingTime() {
  const duration = recipe[state.index].duration;
  if (state.completed) {
    setCaption("流程已完成。");
  } else if (!duration) {
    setCaption("这一步没有活动计时。完成后说继续。");
  } else if (state.paused) {
    setCaption(`当前暂停，计时冻结在 ${formatTime(state.seconds)}。`);
  } else {
    setCaption(`计时还剩 ${formatTime(state.seconds)}。`);
  }
  render();
}

function setZone(zone) {
  if (state.completed || state.paused) {
    setCaption("暂停或完成状态下，相机云台不追手。");
  } else {
    state.zone = zone;
    setCaption(`检测到手腕进入${zone}，相机头转向该区域；步骤不会自动变化。`);
  }
  render();
}

function visionOut() {
  if (state.completed || state.paused) {
    setCaption("当前状态不接受视觉推进。");
  } else {
    state.zone = "回中";
    setCaption("双手离开两个操作区。最多问一次“完成了吗”，不自动推进。");
  }
  render();
}

function resetDemo() {
  state.index = 1;
  state.seconds = recipe[1].duration;
  state.paused = false;
  state.completed = false;
  state.zone = "切配区";
  setCaption("已重新开始。我在等你说“继续”。");
  render();
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    switch (button.dataset.action) {
      case "next": nextStep(); break;
      case "repeat": repeatStep(); break;
      case "pause": togglePause(); break;
      case "remaining": remainingTime(); break;
      case "prep-zone": setZone("切配区"); break;
      case "pan-zone": setZone("锅具区"); break;
      case "vision": visionOut(); break;
      case "reset": resetDemo(); break;
    }
  });
});

setInterval(() => {
  if (state.completed || state.paused || !state.seconds) return;
  state.seconds = Math.max(0, state.seconds - 1);
  if (state.seconds === 0) {
    setCaption("计时结束。请检查现场状态，再决定是否继续。");
  }
  render();
}, 1000);

const header = document.querySelector(".site-header");
const updateHeader = () => {
  header.dataset.elevated = window.scrollY > 18 ? "true" : "false";
};
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();
render();
