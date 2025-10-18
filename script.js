// Identifying key for data saved by our application in the browser.
const STORAGE_KEY = "prompts_storage"

// State to load saved prompts and display them.
const state = {
  prompts: [],
  selectedID: null,
  isDirty: false,
}

// HTML Elements selection
const elements = {
  promptTitle: document.getElementById("prompt-title"),
  promptContent: document.getElementById("prompt-content"),
  titleWrapper: document.getElementById("title-wrapper"),
  contentWrapper: document.getElementById("content-wrapper"),
  btnOpen: document.getElementById("btn-open"),
  btnCollapse: document.getElementById("btn-collapse"),
  sidebar: document.querySelector(".sidebar"),
  btnSave: document.getElementById("btn-save"),
  list: document.getElementById("prompt-list"),
  search: document.getElementById("search-input"),
  btnNew: document.getElementById("btn-new"),
}

// Update wrapper state based on contenteditable element content
function updateEditableWrapperState(element, wrapper) {
  const hasText = element.textContent.trim().length > 0

  wrapper.classList.toggle("is-empty", !hasText)
}

// Function to open and close sidebar
function openSidebar() {
  elements.sidebar.style.display = "flex"
  elements.btnOpen.style.display = "none"
}

function closeSidebar() {
  elements.sidebar.style.display = "none"
  elements.btnOpen.style.display = "block"
}

function updateAllEditableStates() {
  updateEditableWrapperState(elements.promptTitle, elements.titleWrapper)
  updateEditableWrapperState(elements.promptContent, elements.contentWrapper)
}

function attachAllEditableHandlers() {
  if (elements.promptTitle) {
    elements.promptTitle.addEventListener("input", () => {
      updateEditableWrapperState(elements.promptTitle, elements.titleWrapper)
      state.isDirty = true // Mark as dirty on input
    })
  }

  if (elements.promptContent) {
    elements.promptContent.addEventListener("input", () => {
      updateEditableWrapperState(
        elements.promptContent,
        elements.contentWrapper
      )
      state.isDirty = true // Mark as dirty on input
    })
  }
}

function init() {
  load()
  renderList("")
  attachAllEditableHandlers()
  updateAllEditableStates()

  // Initial state: sidebar open, btnOpen hidden
  elements.sidebar.style.display = ""
  elements.btnOpen.style.display = "none"

  // Events to open/close sidebar
  elements.btnOpen.addEventListener("click", openSidebar)
  elements.btnCollapse.addEventListener("click", closeSidebar)
}

// Using .innerHTML instead of .textContent to allow simple HTML formatting in the prompt content, like <br>
function save() {
  const title = elements.promptTitle.innerHTML.trim()
  const content = elements.promptContent.innerHTML.trim()
  const hasContent = elements.promptContent.textContent.trim()

  if (!title || !hasContent) {
    alert("Título e conteúdo não podem estar vazios.")
    return
  }

  if (state.selectedID) {
    // Edit existing prompt
    const idx = state.prompts.findIndex((p) => p.id === state.selectedID)
    if (idx !== -1) {
      state.prompts[idx].title = title
      state.prompts[idx].content = content
    } else {
      // If ID exists but not found in array (should not happen), create new prompt
      const newPrompt = { id: Date.now().toString(36), title, content }
      state.prompts.unshift(newPrompt)
      state.selectedID = newPrompt.id
    }
  } else {
    // Create new prompt. When using toString(36), we convert the number to a base-36 string, which uses digits 0-9 and letters a-z, making it more compact and mixing numbers and letters.
    const newPrompt = { id: Date.now().toString(36), title, content }
    state.prompts.unshift(newPrompt) // unshift adds to the beginning of the array, push would add to the end
    state.selectedID = newPrompt.id
  }

  // persist and update UI
  persist()
  alert("Prompt salvo com sucesso!")
  renderList()
  updateAllEditableStates()
  state.isDirty = false
}
//Function to save prompt data at browser local storage. When working with something out of your control, like localStorage, always use try/catch to avoid breaking your app.
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.prompts)) //Convert object/array to JSON string for storage
  } catch (error) {
    console.log("Erro ao salvar no localStorage:", error)
  }
}

//Function to load prompt data from browser local storage. It prevents save function from overwriting data when the app is opened.
function load() {
  try {
    const storage = localStorage.getItem(STORAGE_KEY)
    state.prompts = storage ? JSON.parse(storage) : [] //Parse the JSON string back to an object/array
    state.selectedID = null
  } catch (error) {
    console.log("Erro ao carregar do localStorage:", error)
  }
}
//Function to create the prompt list in the sidebar
function createPromptItem(prompt) {
  return `
      <li class="prompt-item" data-id="${prompt.id}" data-action="select">
        <div class="prompt-item-content">
          <span class="prompt-item-title">${escapeHtml(prompt.title)}</span>
          <span class="prompt-item-description">${escapeHtml(
            prompt.content
          )}</span>
        </div>
      <button class="btn-icon" title="Remover" data-action="remove">
        <img src="assets/remove.svg" alt="Remover" class="icon icon-trash" />
      </button>
      </li>
  `
}

// Escape HTML when rendering text into the sidebar to avoid markup injection. This prevents users from injecting HTML or scripts into the prompt titles or descriptions, which could lead to security vulnerabilities like Cross-Site Scripting (XSS) attacks.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderList(filterText = "") {
  const filteredPrompts = state.prompts
    .filter(
      (prompt) =>
        prompt.title.toLowerCase().includes(filterText.toLowerCase().trim()) //Lowercase to make the search case insensitive
    )
    .map((p) => createPromptItem(p))
    .join("") //Join the array of strings into a single string without commas

  elements.list.innerHTML = filteredPrompts
}

function newPrompt() {
  state.selectedID = null
  elements.promptTitle.innerHTML = ""
  elements.promptContent.innerHTML = ""
  updateAllEditableStates()
  elements.promptTitle.focus()
}

//Events
elements.btnSave.addEventListener("click", save)
elements.btnNew.addEventListener("click", newPrompt)

elements.search.addEventListener("input", function (event) {
  renderList(event.target.value)
})

elements.list.addEventListener("click", function (event) {
  const removeBtn = event.target.closest("[data-action='remove']")
  const item = event.target.closest("[data-id]")

  if (!item) return // Click outside any prompt item

  const id = item.getAttribute("data-id")

  if (removeBtn) {
    //Remove prompt, re-render list and clear editor if the removed prompt was loaded.
    const idx = state.prompts.findIndex((p) => p.id === id)
    if (idx !== -1) {
      state.prompts.splice(idx, 1)
      alert("Prompt removido com sucesso!")

      persist()
      renderList()

      if (state.prompts.length > 0) {
        // Open the most recent prompt (we unshift on save, so index 0 is the latest)
        const last = state.prompts[0]
        state.selectedID = last.id
        elements.promptTitle.innerHTML = last.title
        elements.promptContent.innerHTML = last.content
        state.isDirty = false
      } else {
        // No prompts left — clear editor
        state.selectedID = null
        elements.promptTitle.innerHTML = ""
        elements.promptContent.innerHTML = ""
      }

      updateAllEditableStates()
    }
    return
  }
  if (event.target.closest("[data-action='select']")) {
    //Select prompt
    const prompt = state.prompts.find((p) => p.id === id)

    if (!prompt) return

    // Only ask for confirmation if the editor was actually modified (isDirty)
    if (state.isDirty) {
      const currentTitle = elements.promptTitle.innerHTML.trim()
      const currentContent = elements.promptContent.innerHTML.trim()
      const contentChanged =
        currentTitle !== prompt.title || currentContent !== prompt.content

      if (contentChanged) {
        const ok = confirm(
          "Você tem alterações não salvas. Deseja substituir pelo item selecionado?"
        )
        if (!ok) return
      }
    }

    // Load selected prompt into editor (preserve stored HTML)
    state.selectedID = id
    elements.promptTitle.innerHTML = prompt.title
    elements.promptContent.innerHTML = prompt.content
    state.isDirty = false

    updateAllEditableStates()
  }
})

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
