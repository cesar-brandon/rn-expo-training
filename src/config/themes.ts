import * as Colors from '@tamagui/colors'
import { createThemes, defaultComponentThemes } from '@tamagui/theme-builder'

const darkPalette = ['hsla(220, 3%, 21%, 1)','hsla(220, 3%, 24%, 1)','hsla(220, 3%, 27%, 1)','hsla(220, 3%, 30%, 1)','hsla(220, 3%, 34%, 1)','hsla(220, 3%, 37%, 1)','hsla(220, 3%, 40%, 1)','hsla(220, 3%, 43%, 1)','hsla(220, 3%, 47%, 1)','hsla(220, 3%, 50%, 1)','hsla(0, 15%, 93%, 1)','hsla(0, 15%, 99%, 1)']
const lightPalette = ['hsla(220, 3%, 84%, 1)','hsla(220, 3%, 80%, 1)','hsla(220, 3%, 76%, 1)','hsla(220, 3%, 72%, 1)','hsla(220, 3%, 69%, 1)','hsla(220, 3%, 65%, 1)','hsla(220, 3%, 61%, 1)','hsla(220, 3%, 57%, 1)','hsla(220, 3%, 54%, 1)','hsla(220, 3%, 50%, 1)','hsla(0, 15%, 15%, 1)','hsla(0, 15%, 1%, 1)']

const lightShadows = {
  shadow1: 'rgba(0,0,0,0.04)',
  shadow2: 'rgba(0,0,0,0.08)',
  shadow3: 'rgba(0,0,0,0.16)',
  shadow4: 'rgba(0,0,0,0.24)',
  shadow5: 'rgba(0,0,0,0.32)',
  shadow6: 'rgba(0,0,0,0.4)',
}

const darkShadows = {
  shadow1: 'rgba(0,0,0,0.2)',
  shadow2: 'rgba(0,0,0,0.3)',
  shadow3: 'rgba(0,0,0,0.4)',
  shadow4: 'rgba(0,0,0,0.5)',
  shadow5: 'rgba(0,0,0,0.6)',
  shadow6: 'rgba(0,0,0,0.7)',
}

// we're adding some example sub-themes for you to show how they are done, "success" "warning", "error":

const builtThemes = createThemes({
  componentThemes: defaultComponentThemes,

  base: {
    palette: {
      dark: darkPalette,
      light: lightPalette,
    },

    extra: {
      light: {
        ...Colors.green,
        ...Colors.red,
        ...Colors.yellow,
        ...lightShadows,
        shadowColor: lightShadows.shadow1,
        customGray: '#b0b6bb',
      },
      dark: {
        ...Colors.greenDark,
        ...Colors.redDark,
        ...Colors.yellowDark,
        ...darkShadows,
        shadowColor: darkShadows.shadow1,
        customGray: '#6a6e72',
      },
    },
  },

  accent: {
    palette: {
      dark: ['hsla(0, 0%, 35%, 1)','hsla(0, 0%, 38%, 1)','hsla(0, 0%, 41%, 1)','hsla(0, 0%, 43%, 1)','hsla(0, 0%, 46%, 1)','hsla(0, 0%, 49%, 1)','hsla(0, 0%, 52%, 1)','hsla(0, 0%, 54%, 1)','hsla(0, 0%, 57%, 1)','hsla(0, 0%, 60%, 1)','hsla(220, 3%, 90%, 1)','hsla(220, 3%, 95%, 1)'],
      light: ['hsla(0, 0%, 95%, 1)','hsla(0, 0%, 92%, 1)','hsla(0, 0%, 88%, 1)','hsla(0, 0%, 85%, 1)','hsla(0, 0%, 82%, 1)','hsla(0, 0%, 78%, 1)','hsla(0, 0%, 75%, 1)','hsla(0, 0%, 72%, 1)','hsla(0, 0%, 68%, 1)','hsla(0, 0%, 65%, 1)','hsla(220, 3%, 21%, 1)','hsla(220, 3%, 21%, 1)'],
    },
  },

  childrenThemes: {
    warning: {
      palette: {
        dark: Object.values(Colors.yellowDark),
        light: Object.values(Colors.yellow),
      },
    },

    error: {
      palette: {
        dark: Object.values(Colors.redDark),
        light: Object.values(Colors.red),
      },
    },

    success: {
      palette: {
        dark: Object.values(Colors.greenDark),
        light: Object.values(Colors.green),
      },
    },
  },

  // optionally add more, can pass palette or template

  // grandChildrenThemes: {
  //   alt1: {
  //     template: 'alt1',
  //   },
  //   alt2: {
  //     template: 'alt2',
  //   },
  //   surface1: {
  //     template: 'surface1',
  //   },
  //   surface2: {
  //     template: 'surface2',
  //   },
  //   surface3: {
  //     template: 'surface3',
  //   },
  // },
})

export type Themes = typeof builtThemes

// the process.env conditional here is optional but saves web client-side bundle
// size by leaving out themes JS. tamagui automatically hydrates themes from CSS
// back into JS for you, and the bundler plugins set TAMAGUI_ENVIRONMENT. so
// long as you are using the Vite, Next, Webpack plugins this should just work,
// but if not you can just export builtThemes directly as themes:
export const themes: Themes =
  process.env.TAMAGUI_ENVIRONMENT === 'client' &&
  process.env.NODE_ENV === 'production'
    ? ({} as any)
    : (builtThemes as any)
