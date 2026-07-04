<script lang="ts">
  import { Dialog as DialogPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: DialogPrimitive.RootProps = $props();
</script>

<DialogPrimitive.Root bind:ref class={cn(className)} {...restProps} />
