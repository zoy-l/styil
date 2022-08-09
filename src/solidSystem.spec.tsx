/* @jsxImportSource solid-js */
import { createSystem, styled, global } from './solidSystem'

const { styled: styleTheme } = createSystem({
  theme: () => ({ color: 'red', bg: 'blue' }),
  defaultMode: 'light'
})

const Anthor = styled(
  'a',
  {
    height: '$height',
    '.foo': {
      width: '$width'
    }
  },
  {
    size: {
      small: {
        width: '100',
        height: '$asb',
        borderRightWidth: '$targetSize',
        borderBottomWidth: '$targetSize',
        borderLeftWidth: '$targetSize',
        marginLeft: '$targetSizeX',
        marginTop: '$targetSizeY'
      }
    }
  }
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function asButton({ ref, hello }: { ref: HTMLButtonElement; hello: boolean }) {
  return (
    <Anthor
      cssState={{
        width: 1,
        height: 2,
        targetSizeY: 1,
        targetSizeX: 1,
        targetSize: 1,
        // @ts-expect-error test
        foo: 2
      }}
      as="button"
      variants={{
        size: 'small'
      }}
      ref={ref}
    />
  )
}

// @ts-expect-error Do not expose to the outside world
styled.sourceMap

// @ts-expect-error Do not expose to the outside world
global.sourceMap

global({
  body: {
    display: 'block'
  }
})

const ToLink = styleTheme(asButton, (theme) => {
  expectType<
    {
      color: string
      bg: string
    },
    typeof theme
  >(theme)
  return {}
})

const ToLink2 = styled(ToLink, {})

expectType<typeof ToLink, typeof ToLink2>(ToLink2)

export function renderToLink({ ref }: { ref: HTMLButtonElement }) {
  return <ToLink2 ref={ref} hello />
}

const ButtonDark = styled(
  'button',
  {},
  {
    disabled: {
      true: {
        fontSize: 14
      }
    }
  }
)

export function renderButtonDark() {
  return (
    <ButtonDark
      as="a"
      ref={(ref: HTMLAnchorElement) => {
        ref.href
      }}
      variants={{ disabled: true }}
    />
  )
}

const ButtonCount = styled(
  'button',
  {},
  {
    disabled: {
      1: {
        fontSize: 14
      }
    }
  }
)

export function renderButtonCount() {
  return <ButtonCount variants={{ disabled: 1 }} />
}
