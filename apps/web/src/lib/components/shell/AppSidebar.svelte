<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import { link, getPath } from "$lib/router.svelte";
  import ProjectSwitcher from "./ProjectSwitcher.svelte";
  import ThemeToggle from "./ThemeToggle.svelte";
  import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
  import FolderIcon from "@lucide/svelte/icons/folder";
  import BotIcon from "@lucide/svelte/icons/bot";
  import SparklesIcon from "@lucide/svelte/icons/sparkles";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import BrainIcon from "@lucide/svelte/icons/brain";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
  import HeartPulseIcon from "@lucide/svelte/icons/heart-pulse";
  import SquareTerminalIcon from "@lucide/svelte/icons/square-terminal";
  import WorkflowIcon from "@lucide/svelte/icons/workflow";
  import ListChecksIcon from "@lucide/svelte/icons/list-checks";
  import CalendarClockIcon from "@lucide/svelte/icons/calendar-clock";
  import RadarIcon from "@lucide/svelte/icons/radar";

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
    { href: "/projects", label: "Projects", icon: FolderIcon },
    { href: "/agents", label: "Agents", icon: BotIcon },
    { href: "/skills", label: "Skills", icon: SparklesIcon },
    { href: "/instructions", label: "Instructions", icon: FileTextIcon },
    { href: "/memory", label: "Memory", icon: BrainIcon },
    { href: "/coomer", label: "Coomer", icon: RadarIcon },
    { href: "/configs", label: "Configs", icon: SettingsIcon },
    { href: "/health", label: "Health", icon: HeartPulseIcon },
    { href: "/terminal", label: "Terminal", icon: SquareTerminalIcon },
  ];
  const automationItems = [
    { href: "/workflows", label: "Workflows", icon: WorkflowIcon },
    { href: "/jobs", label: "Jobs", icon: ListChecksIcon },
    { href: "/schedules", label: "Schedules", icon: CalendarClockIcon },
  ];

  const path = $derived(getPath());
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header class="gap-3 px-2">
    <div
      class="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center"
    >
      <span
        class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold tracking-tight"
        >W</span
      >
      <div class="min-w-0 group-data-[collapsible=icon]:hidden">
        <p class="truncate text-sm font-semibold tracking-tight">Weave</p>
        <p class="text-muted-foreground truncate text-xs">Control plane</p>
      </div>
    </div>
    <ProjectSwitcher />
  </Sidebar.Header>
  <Sidebar.Content class="px-1">
    <Sidebar.Group class="px-1 py-2">
      <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each navItems as item (item.href)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                isActive={path === item.href}
                tooltipContent={item.label}
              >
                {#snippet child({ props })}
                  <a href={item.href} use:link {...props}>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
    <Sidebar.Group class="px-1 py-2">
      <Sidebar.GroupLabel>Automation</Sidebar.GroupLabel>
      <Sidebar.GroupContent
        ><Sidebar.Menu>
          {#each automationItems as item (item.href)}
            <Sidebar.MenuItem
              ><Sidebar.MenuButton
                isActive={path === item.href ||
                  path.startsWith(`${item.href}/`)}
                tooltipContent={item.label}
                >{#snippet child({ props })}<a
                    href={item.href}
                    use:link
                    {...props}><item.icon /><span>{item.label}</span></a
                  >{/snippet}</Sidebar.MenuButton
              ></Sidebar.MenuItem
            >
          {/each}
        </Sidebar.Menu></Sidebar.GroupContent
      >
    </Sidebar.Group>
    <Sidebar.Separator class="my-2" />
    <Sidebar.Group class="px-1 py-2">
      <Sidebar.GroupLabel>System</Sidebar.GroupLabel>
      <Sidebar.GroupContent
        ><Sidebar.Menu
          ><Sidebar.MenuItem
            ><Sidebar.MenuButton
              isActive={path === "/settings"}
              tooltipContent="Settings"
              >{#snippet child({ props })}<a
                  href="/settings"
                  use:link
                  {...props}><SlidersHorizontalIcon /><span>Settings</span></a
                >{/snippet}</Sidebar.MenuButton
            ></Sidebar.MenuItem
          ></Sidebar.Menu
        ></Sidebar.GroupContent
      >
    </Sidebar.Group>
  </Sidebar.Content>
  <Sidebar.Footer class="border-sidebar-border border-t px-3 py-2">
    <ThemeToggle />
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>
