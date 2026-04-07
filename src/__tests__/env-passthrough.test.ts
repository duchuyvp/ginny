/**
 * Tests for envBool("PASSTHROUGH") behavior.
 *
 * Verifies that the passthrough env var is parsed correctly — in particular
 * that "0" and "false" disable passthrough (Boolean("0") is true in JS,
 * which was the original bug).
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { envBool } from "../env"

describe("envBool — PASSTHROUGH", () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    saved.GINNY_PASSTHROUGH = process.env.GINNY_PASSTHROUGH
    saved.CLAUDE_PROXY_PASSTHROUGH = process.env.CLAUDE_PROXY_PASSTHROUGH
    delete process.env.GINNY_PASSTHROUGH
    delete process.env.CLAUDE_PROXY_PASSTHROUGH
  })

  afterEach(() => {
    if (saved.GINNY_PASSTHROUGH !== undefined) {
      process.env.GINNY_PASSTHROUGH = saved.GINNY_PASSTHROUGH
    } else {
      delete process.env.GINNY_PASSTHROUGH
    }
    if (saved.CLAUDE_PROXY_PASSTHROUGH !== undefined) {
      process.env.CLAUDE_PROXY_PASSTHROUGH = saved.CLAUDE_PROXY_PASSTHROUGH
    } else {
      delete process.env.CLAUDE_PROXY_PASSTHROUGH
    }
  })

  it("returns true for GINNY_PASSTHROUGH=1", () => {
    process.env.GINNY_PASSTHROUGH = "1"
    expect(envBool("PASSTHROUGH")).toBe(true)
  })

  it("returns true for GINNY_PASSTHROUGH=true", () => {
    process.env.GINNY_PASSTHROUGH = "true"
    expect(envBool("PASSTHROUGH")).toBe(true)
  })

  it("returns true for GINNY_PASSTHROUGH=yes", () => {
    process.env.GINNY_PASSTHROUGH = "yes"
    expect(envBool("PASSTHROUGH")).toBe(true)
  })

  it("returns false for GINNY_PASSTHROUGH=0 (Boolean('0') bug)", () => {
    process.env.GINNY_PASSTHROUGH = "0"
    expect(envBool("PASSTHROUGH")).toBe(false)
  })

  it("returns false for GINNY_PASSTHROUGH=false", () => {
    process.env.GINNY_PASSTHROUGH = "false"
    expect(envBool("PASSTHROUGH")).toBe(false)
  })

  it("returns false for GINNY_PASSTHROUGH=no", () => {
    process.env.GINNY_PASSTHROUGH = "no"
    expect(envBool("PASSTHROUGH")).toBe(false)
  })

  it("returns false for empty string", () => {
    process.env.GINNY_PASSTHROUGH = ""
    expect(envBool("PASSTHROUGH")).toBe(false)
  })

  it("returns false when neither env var is set", () => {
    expect(envBool("PASSTHROUGH")).toBe(false)
  })

  it("falls back to CLAUDE_PROXY_PASSTHROUGH when GINNY_ is not set", () => {
    process.env.CLAUDE_PROXY_PASSTHROUGH = "1"
    expect(envBool("PASSTHROUGH")).toBe(true)
  })

  it("GINNY_ takes precedence over CLAUDE_PROXY_", () => {
    process.env.GINNY_PASSTHROUGH = "0"
    process.env.CLAUDE_PROXY_PASSTHROUGH = "1"
    expect(envBool("PASSTHROUGH")).toBe(false)
  })
})
