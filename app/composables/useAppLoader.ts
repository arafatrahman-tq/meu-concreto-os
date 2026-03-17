import { ref } from 'vue'

export const useAppLoader = () => {
  const isLoading = useState('app:isLoading', () => true)
  const progress = useState('app:loaderProgress', () => 0)

  const animationFrameId: number | null = null
  let fakeProgressInterval: ReturnType<typeof setInterval> | null = null

  const reset = () => {
    progress.value = 0
    isLoading.value = true
    if (fakeProgressInterval) clearInterval(fakeProgressInterval)
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
  }

  const startLoading = () => {
    reset()

    // Animate smoothly to ~90% over a few seconds
    const targetProgress = 90
    const duration = 2500 // 2.5 seconds to reach 90%
    const updateInterval = 50
    const steps = duration / updateInterval
    const increment = targetProgress / steps

    fakeProgressInterval = setInterval(() => {
      if (progress.value < targetProgress) {
        // Slow down as it gets closer to 90
        const easeIncrement = increment * (1 - (progress.value / 100))
        progress.value = Math.min(progress.value + easeIncrement, targetProgress)
      } else {
        if (fakeProgressInterval) clearInterval(fakeProgressInterval)
      }
    }, updateInterval)
  }

  const finishLoading = () => {
    if (fakeProgressInterval) clearInterval(fakeProgressInterval)

    // Jump to 100%
    progress.value = 100

    // Wait for the CSS transition of the progress bar to finish visually
    setTimeout(() => {
      isLoading.value = false
    }, 500) // Delay relative to the transition duration we'll set on CSS
  }

  return {
    isLoading,
    progress,
    startLoading,
    finishLoading
  }
}
