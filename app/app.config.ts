export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'zinc'
    },
    button: {
      rounded: 'rounded-2xl',
      defaultVariants: {
        size: 'md'
      },
      default: {
        loadingIcon: 'i-lucide-loader-circle'
      }
    },
    input: {
      rounded: 'rounded-2xl',
      base: 'transition-all focus:ring-2 focus:ring-primary-500 dark:focus:bg-zinc-900',
      defaultVariants: {
        size: 'lg'
      }
    },
    card: {
      slots: {
        root: 'ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm'
      }
    },
    slideover: {
      variants: {
        side: {
          right: {
            content: 'max-w-none sm:w-[680px] lg:w-[860px] xl:w-[960px]'
          }
        }
      }
    }
  }
})
