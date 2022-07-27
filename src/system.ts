import React from 'react'
import { createSelector } from './createSelector'
import { type SystemOptions, type Styled, type System } from './systemTypes'
import { type CSSAttribute, type AnyObject } from './types'
import { parseRules } from './parse'
import { StyleSheet, type OldRule } from './sheet'

export function createSystem<Theme extends AnyObject = {}>(
  options: SystemOptions<Theme> = {}
): System<Theme> {
  const splitSymbol = '|'
  const isBrowser = !!globalThis.document

  const selectorCache = new Set<string>([])
  const globalCache: Record<
    string,
    {
      segmentRuleCode: string[]
      ruleCode: string
    }
  > = {}

  const {
    theme: inputTheme = () => ({} as AnyObject),
    defaultMode = 'none',
    sheetOptions = {}
  } = options
  const { key, container, speedy, nonce } = sheetOptions
  const globalMode = { mode: defaultMode }
  let currentMode = globalMode.mode
  const metaHtml = isBrowser
    ? (document.querySelector(`meta[name="styil-cache"]`) as HTMLMetaElement)
    : null

  if (isBrowser && !selectorCache.size && metaHtml) {
    metaHtml.content.split(splitSymbol).forEach((name) => {
      selectorCache.add(name)
    })
  }

  const sheet = new StyleSheet({
    key: key ?? 'css',
    speedy: speedy === undefined ? process.env.NODE_ENV === 'production' : speedy,
    container: isBrowser ? container ?? document.head : null,
    nonce
  })

  const themeContent = React.createContext<{
    mode: string
    setMode: React.Dispatch<React.SetStateAction<string>>
    theme: Theme
  }>(
    // @ts-expect-error no value initially
    {}
  )

  const SystemProvider = (props: { children: React.ReactNode }) => {
    const [mode, setMode] = React.useState<string>(defaultMode)

    const updataMode = (value: string) => {
      setMode(value)
      globalMode.mode = value
      currentMode = value
    }

    return React.createElement(
      themeContent.Provider,
      { value: { mode, setMode: updataMode, theme: inputTheme(mode) } },
      props.children
    )
  }

  const useSystem = () => {
    return React.useContext(themeContent)
  }

  let modeIdentifier: Record<string, { targetClassName: string; namespaceJoiner: string }>[] = []
  let withIndex = 0

  const styled: Styled<Theme> = (tag, styles, interpolation) => {
    let inputTag = tag
    const inputNamespace = (tag as { namespace: string }).namespace ?? ''

    if (typeof tag === 'object' && tag.tag) {
      inputTag = tag.tag
    }

    const currentWithIndex = withIndex

    function createRule(
      mode: string,
      inputTargetInfo: { targetClassName: string; namespaceJoiner: string }
    ) {
      const identifier = modeIdentifier[currentWithIndex]?.[mode]

      if (identifier) {
        const { namespaceJoiner, targetClassName } = identifier
        inputTargetInfo.namespaceJoiner = namespaceJoiner
        inputTargetInfo.targetClassName = targetClassName
        return
      }

      const theme = inputTheme(mode)
      const style = typeof styles === 'function' ? styles(theme, mode) : styles

      const variants =
        typeof interpolation === 'function' ? interpolation(theme, mode) : interpolation

      const selector = createSelector(style)

      let targetClassName = selector
      let namespaceJoiner = ''

      if (inputNamespace) {
        targetClassName = `${inputNamespace}-${selector}`
        namespaceJoiner = `${inputNamespace}-`
      }

      if (!selectorCache.has(targetClassName)) {
        selectorCache.add(targetClassName)
        sheet.insertStyle(parseRules(style, `.${targetClassName}`))
      }

      if (variants) {
        const variantsKeys = Object.keys(variants)
        let variantsIndex = variantsKeys.length

        while (variantsIndex--) {
          const variantsKey = variantsKeys[variantsIndex]
          const variantsValue = variants[variantsKey]

          const variantsChildKeys = Object.keys(variantsValue)
          let variantsChildIndex = variantsChildKeys.length

          while (variantsChildIndex--) {
            const key = variantsChildKeys[variantsChildIndex]
            const value = variantsValue[key]
            const variantsClassName = `${targetClassName}.${namespaceJoiner}${variantsKey}-${key}`

            if (!selectorCache.has(variantsClassName)) {
              selectorCache.add(variantsClassName)
              sheet.insertStyle(parseRules(value, `.${variantsClassName}`))
            }
          }
        }
      }

      inputTargetInfo.targetClassName = targetClassName
      inputTargetInfo.namespaceJoiner = namespaceJoiner

      if (!modeIdentifier[currentWithIndex]) {
        modeIdentifier[currentWithIndex] = {}
      }

      modeIdentifier[currentWithIndex][mode] = {
        targetClassName,
        namespaceJoiner
      }

      withIndex++
    }

    const targetInfo = {
      targetClassName: '',
      namespaceJoiner: ''
    }

    createRule(defaultMode, targetInfo)

    const styledComponent = React.forwardRef<HTMLElement, AnyObject>((props, ref) => {
      const { as = inputTag, className = '', variants: variantsProps, ...rest } = props
      let variantsClassName = ''

      const { mode } = useSystem()

      if (mode !== undefined) {
        createRule(mode, targetInfo)
      }

      if (variantsProps) {
        const variantsPropsKeys = Object.keys(variantsProps)
        let variantsPropsIndex = variantsPropsKeys.length

        while (variantsPropsIndex--) {
          const key = variantsPropsKeys[variantsPropsIndex]
          const value = variantsProps[key]

          if (value !== undefined && value !== null) {
            variantsClassName += ` ${targetInfo.namespaceJoiner}${key}-${value}`
          }
        }
      }

      return React.createElement(as, {
        className: `${className ? className + ' ' : className}${
          targetInfo.targetClassName
        }${variantsClassName}`,
        ref,
        ...rest
      })
    })

    if (process.env.NODE_ENV !== 'production') {
      styledComponent.displayName = styledComponent.displayName ?? targetInfo.targetClassName
    }

    Object.defineProperty(styledComponent, 'toString', {
      value() {
        // Cross-rendering, after being fetched, child components will not be recalculated
        createRule(currentMode, targetInfo)
        return `.${targetInfo.targetClassName}`
      }
    })

    return styledComponent
  }

  function getCssValue() {
    const selectorCacheString = [...selectorCache].join(splitSymbol)
    const globalStyleTag = sheet.ssrGlobalData
      ? `\n<style data-styil="${sheet.key}" global>${sheet.ssrGlobalData}</style>`
      : ''

    const html = `<meta name="styil-cache" mode="${currentMode}" content="${selectorCacheString}">${globalStyleTag}
    <style data-styil="${sheet.key}">${sheet.ssrData}</style>`

    const StyilRules = React.createElement(
      React.Fragment,
      {},
      React.createElement('meta', {
        name: 'styil-cache',
        mode: currentMode,
        content: selectorCacheString
      }),
      React.createElement(
        'style',
        { 'data-styil': sheet.key, global: 'true' },
        sheet.ssrGlobalData
      ),
      React.createElement('style', { 'data-styil': sheet.key }, sheet.ssrData)
    )

    flush('global')
    return { html, StyilRules }
  }

  function global(styles: CSSAttribute | ((theme: Theme, mode: string) => CSSAttribute)) {
    let oldRule: OldRule[]

    function createGlobRules(mode: string) {
      if (oldRule) {
        const tagIndex: number[] = []
        oldRule.forEach((rule) => {
          if (!tagIndex[rule.tagIndex]) tagIndex[rule.tagIndex] = 0
          sheet.flushSingle({
            tag: rule.tag,
            index: sheet.speedy ? rule.index - tagIndex[rule.tagIndex] : rule.index
          })

          tagIndex[rule.tagIndex]++
        })

        oldRule = undefined
      }

      if (isBrowser && metaHtml && mode === metaHtml.getAttribute('mode')) {
        return
      }

      let rules: { segmentRuleCode: string[]; ruleCode: string }
      const cache = globalCache[mode]

      if (globalCache[mode]) {
        rules = cache
      } else {
        const style = typeof styles === 'function' ? styles(inputTheme(mode), mode) : styles
        rules = parseRules(style)
        globalCache[mode] = rules
      }

      oldRule = sheet.insertStyle(rules, true)
    }

    createGlobRules(defaultMode)

    Object.defineProperty(globalMode, 'mode', {
      set: createGlobRules
    })
  }

  // global style retention
  function flush(type: 'all' | 'global' = 'all') {
    sheet.flush(type)
    selectorCache.clear()
    modeIdentifier = []
  }

  return { styled, SystemProvider, useSystem, getCssValue, flush, global }
}

export const { styled, getCssValue, flush, global } = createSystem()
