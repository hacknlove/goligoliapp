import "./style/1.vars.scss";
import "./style/common.scss";
import "./style/hidden-word.scss";
import "./style/mobile.scss";
import "./style/textarea.scss";
import "./style/nav.scss";
import fs from "fs";

function parse() {
  const script = fs.readFileSync("./src/script.txt", "utf8");

  const roles = new Set();

  const scenes = [];
  let currentScene;
  let currentRole;

  const roleMatcher = /(^[A-Z 0-9_-]+):\s*(.*)$/;

  const lines = script.split("\n");

  for (let line of lines) {
    if (line.startsWith("ESCENA: ")) {
      currentScene = {
        name: line.replace("ESCENA: ", ""),
        roles: new Set(),
        lines: [],
      }
      scenes.push(currentScene);
      continue
    }

    const lineWithRole = line.match(roleMatcher);
    if (lineWithRole) {
      currentRole = lineWithRole[1];
      if (!currentRole !== "NOTA") {
        roles.add(currentRole);
        currentScene.roles.add(currentRole);
      }
      line = lineWithRole[2];
    }
    currentScene.lines.push({ role: currentRole, text: line });
  }
  return {
    roles,
    scenes
  };
}

const script = parse();

document.addEventListener("DOMContentLoaded", MAIN);

const query = new URLSearchParams(window.location.search);

let currentRole = query.get("role") || null;
let currentScene = query.get("scene") || 0;
let currentLevel = query.get("level") || 0;

function updateUrl (key, value) {
  const params = new URLSearchParams(window.location.search);
  params.set(key, value);
  history.pushState({}, "", `?${params.toString()}`);
  window.scrollTo(0, 0, { behavior: "smooth" });
}

function initializeRoleSelector() {
  const select = document.getElementById("role-selector");

  select.addEventListener("change", (event) => {
    currentRole = event.target.value;
    updateUrl("role", currentRole);
    updateSceneSelector();
    updatePlayArea();
  });
}

function updateRoleSelector() {
  const select = document.getElementById("role-selector");
  const options = Array.from(script.roles, (role) => {
    if (role === "NOTA") {
      return "";
    }
    if (currentScene && !script.scenes[currentScene].roles.has(role)) {
      return "";
    }
    return `<option value="${role}">${role}</option>`;
  });

  select.innerHTML = "<option value=''>TODO</option>" + options.join("");
  if (currentRole) {
    select.value = currentRole;
  }
}

function initializeSceneSelector() {
  const select = document.getElementById("scene-selector");

  select.addEventListener("change", (event) => {
    currentScene = event.target.value;
    updateUrl("scene", currentScene);
    updateRoleSelector();
    updatePlayArea();
  });
}

function updateSceneSelector() {
  const options = script.scenes.map((scene, index) => {
    if (currentRole && !scene.roles.has(currentRole)) {
      return "";
    }
    return `<option value="${index}">Escena ${scene.name}</option>`;
  });

  const select = document.getElementById("scene-selector");
  select.innerHTML = options.join("");
  if (currentScene) {
    select.value = currentScene;
  }
}

function initializeLevelSelector() {
  const select = document.getElementById("level-selector");
  select.addEventListener("change", (event) => {
    currentLevel = event.target.value;
    updateUrl("level", currentLevel);
    updatePlayArea();
  });
}

function MAIN() {
  updateRoleSelector();
  updateSceneSelector();

  initializeRoleSelector();
  initializeSceneSelector();

  initializeLevelSelector();

  updatePlayArea();
  

  playground.addEventListener("click", (event) => {
    if (event.target.classList.contains("hidden-word")) {
      event.target.classList.toggle("revealed");
    }
  });
}

function insertRoleIfNew(scene, index, className = '') {
  if (index === 0 || scene.lines[index - 1].role !== scene.lines[index].role) {
    return `<span class="role ${className}">${scene.lines[index].role}</span>: `;
  }
  return "";
}
function continueIfNotLast(scene, index) {
  if (scene.lines[index + 1]?.role === scene.lines[index].role) {
    return "continue";
  }
  return "";
}

function updatePlayArea() {
  const scene = script.scenes[currentScene];
  if (!scene) {
    return;
  }
  let html = ""
  for (let i = 0; i < scene.lines.length; i++) {
    if (!currentRole) {
      html += `<p class="dialogue main ${continueIfNotLast(scene, i)}">${insertRoleIfNew(scene, i, true)}${scene.lines[i].text}</p>`;
      continue;
    }
    if (scene.lines[i].role === currentRole) {
      html += `<p class="dialogue main ${continueIfNotLast(scene, i)}">${insertRoleIfNew(scene, i, true)}${gaps(scene.lines[i].text)}</p>`;
      continue;
    }

    if (scene.lines[i + 1]?.role === currentRole) {
      html += `<p class="dialogue pre"><span class="role">${scene.lines[i].role}</span>: ${scene.lines[i].text}</p>`;
      continue;
    }
  }
  playground.innerHTML = html;
}

function gaps(text) {
  const notes = []
  text = text.replaceAll(/\(.*?\)/g, () => {
    notes.push(arguments[0]);
    return `$[${notes.length - 1}]`;
  })

  const words = text.split(/\s+/).map((word) => (word.match(/^\$\[[0-9]+]/) ? null : true));
 
  const wordsIndex = words.map((word, index) => word && index).filter((index) => index !== null);


  let wordsToRemove = Math.floor(words.length * (currentLevel / 10));

  let wordsLength = words.length;

  while (wordsToRemove) {
    const remove = Math.floor(Math.random() * wordsLength);

    words[wordsIndex[remove]] = false;

    wordsIndex.splice(remove, 1);

    wordsLength--;
    wordsToRemove--;
  }


  let i = 0;

  text = text.replace(/[^\s]+/g, (word) => {
    if (words[i++] === false) {
      return `<span class="hidden-word">${word}</span>`;
    }
    const note = word.match(/^\$\[([0-9]+)]/);
    if (note) {
      return `<span class="note">${notes[note[1]]}</span>`;
    }
    return word;
  });


  return text;
}
