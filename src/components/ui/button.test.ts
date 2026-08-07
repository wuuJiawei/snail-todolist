import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  it("shows loading until an async click finishes", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement("div")
    const root = createRoot(container)
    let resolveAction: () => void = () => undefined
    const onClick = vi.fn(() => new Promise<void>((resolve) => {
      resolveAction = resolve
    }))

    await act(async () => {
      root.render(React.createElement(Button, { onClick }, "保存"))
    })

    const button = container.querySelector("button") as HTMLButtonElement
    await act(async () => {
      button.click()
    })

    expect(button.disabled).toBe(true)
    expect(button.getAttribute("aria-busy")).toBe("true")
    expect(button.querySelector("[data-loading-spinner]")).not.toBeNull()

    await act(async () => {
      resolveAction()
      await Promise.resolve()
    })

    expect(button.disabled).toBe(false)
    expect(button.hasAttribute("aria-busy")).toBe(false)

    await act(async () => root.unmount())
  })
})
