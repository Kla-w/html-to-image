/* tslint:disable:max-line-length */

import { Options } from './index'
import { getDataURLContent } from './util'

// KNOWN ISSUE
// -----------
// Can not handle redirect-url, such as when access 'http://something.com/avatar.png'
// will redirect to 'http://something.com/65fc2ffcc8aea7ba65a1d1feda173540'

const TIMEOUT = 30000
const cache: {
  [url: string]: Promise<string | null>
} = {}

function isFont(filename: string) {
  return /ttf|otf|eot|woff2?/i.test(filename)
}

export function getBlobFromURL(
  url: string,
  options: Options,
): Promise<string | null> {
  let corsUrl = options.corsProxy ? options.corsProxy + url : url

  let href = url.replace(/\?.*/, '')

  if (isFont(href)) {
    href = href.replace(/.*\//, '')
  }

  if (cache[href]) {
    return cache[href]
  }

  // cache bypass so we dont have CORS issues with cached images
  // ref: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
  if (options.cacheBust) {
    // tslint:disable-next-line
    corsUrl += (/\?/.test(corsUrl) ? '&' : '?') + new Date().getTime()
  }

  const failed = (reason: any) => {
    let placeholder = ''
    if (options.imagePlaceholder) {
      const parts = options.imagePlaceholder.split(/,/)
      if (parts && parts[1]) {
        placeholder = parts[1]
      }
    }

    let msg = `Failed to fetch resource: ${corsUrl}`
    if (reason) {
      msg = typeof reason === 'string' ? reason : reason.message
    }

    if (msg) {
      console.error(msg)
    }

    return placeholder
  }

  const deferred = window
        .fetch(corsUrl)
        .then((response) => response.blob())
        .then(
          (blob) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            }),
        )
        .then(getDataURLContent)
        .catch(() => new Promise((resolve, reject) => reject()))

  const promise = deferred.catch(failed) as Promise<string | null>
  cache[href] = promise

  return promise
}
