type Page = "projects" | "agents" | "skills" | "instructions" | "settings";

let currentPage = $state<Page>("projects");

export function getCurrentPage() {
  return currentPage;
}

export function setCurrentPage(page: Page) {
  currentPage = page;
}
