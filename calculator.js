(() => {
  "use strict";

  const expressionEl = document.getElementById("expression");
  const valueEl = document.getElementById("value");
  const keysEl = document.getElementById("keys");

  const state = {
    display: "0", // text shown on the main line
    stored: null, // left-hand operand waiting for an operator
    op: null, // pending operator symbol
    expr: [], // tokens for the small line, e.g. ["12", "+", "5", "="]
    operand: false, // a number has been entered since the last operator
    fresh: true, // the next digit starts a new number
    resolved: false, // last press was "="
    error: false,
  };

  const MAX_INPUT_DIGITS = 12;
  const MAX_SIGNIFICANT = 15;

  function reset() {
    state.display = "0";
    state.stored = null;
    state.op = null;
    state.expr = [];
    state.operand = false;
    state.fresh = true;
    state.resolved = false;
    state.error = false;
  }

  function fail() {
    state.display = "Error";
    state.error = true;
    state.stored = null;
    state.op = null;
    state.operand = false;
    state.fresh = true;
    state.resolved = false;
  }

  function format(n) {
    if (!Number.isFinite(n)) return "Error";

    const rounded = Number(n.toPrecision(MAX_SIGNIFICANT));
    if (rounded === 0) return "0";
    if (Number.isInteger(rounded) && Math.abs(rounded) < 1e15) {
      return String(rounded);
    }
    if (Math.abs(rounded) >= 1e15 || Math.abs(rounded) < 1e-7) {
      return rounded
        .toExponential(6)
        .replace(/\.?0+e/, "e");
    }
    return String(rounded);
  }

  function apply(a, b, op) {
    switch (op) {
      case "+":
        return a + b;
      case "−":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  }

  function inputDigit(d) {
    if (state.error || state.resolved) reset();

    if (state.fresh) {
      state.display = d === "." ? "0." : d;
      state.operand = true;
      state.fresh = false;
      return;
    }

    if (d === ".") {
      if (state.display.includes(".")) return;
      state.display += ".";
      state.operand = true;
      return;
    }

    if (state.display.replace(/\D/g, "").length >= MAX_INPUT_DIGITS) return;

    if (state.display === "0") state.display = d;
    else if (state.display === "-0") state.display = "-" + d;
    else state.display += d;

    state.operand = true;
  }

  function chooseOp(op) {
    if (state.error) return;

    const value = Number(state.display);

    if (state.op === null) {
      state.stored = value;
      state.expr = [format(value), op];
    } else if (state.operand) {
      const next = apply(state.stored, value, state.op);
      state.expr.push(format(value), op);
      state.stored = next;
      state.display = format(next);

      if (!Number.isFinite(next)) {
        fail();
        return;
      }
    } else {
      state.op = op;
      state.expr[state.expr.length - 1] = op;
      return;
    }

    state.op = op;
    state.operand = false;
    state.fresh = true;
    state.resolved = false;
  }

  function equals() {
    if (state.error) return;

    if (state.op === null) {
      state.display = format(Number(state.display));
      state.expr = [state.display, "="];
      state.operand = false;
      state.fresh = true;
      state.resolved = true;
      return;
    }

    const b = state.operand ? Number(state.display) : state.stored;
    const result = apply(state.stored, b, state.op);

    state.expr.push(format(b), "=");
    state.display = format(result);
    state.op = null;
    state.stored = null;
    state.operand = false;
    state.fresh = true;
    state.resolved = true;

    if (!Number.isFinite(result)) fail();
  }

  function percent() {
    if (state.error) return;

    const n = Number(state.display);
    const pending = state.op !== null && state.operand;
    const value = pending ? (state.stored * n) / 100 : n / 100;

    state.display = format(value);
    state.operand = true;
    state.fresh = true;
    state.resolved = false;
  }

  function negate() {
    if (state.error || state.display === "0") return;

    state.display = state.display.startsWith("-")
      ? state.display.slice(1)
      : "-" + state.display;
    state.operand = true;
    state.fresh = false;
    state.resolved = false;
  }

  function backspace() {
    if (state.error || state.resolved) {
      reset();
      return;
    }
    if (!state.operand) return;

    const trimmed = state.display.slice(0, -1);
    state.display = trimmed === "" || trimmed === "-" ? "0" : trimmed;
    state.fresh = false;
  }

  function render() {
    valueEl.textContent = state.display;
    valueEl.classList.toggle("small", state.display.length > 9);
    valueEl.classList.toggle("error", state.error);
    expressionEl.textContent = state.expr.join(" ");
  }

  function run(button) {
    const { digit, op, action } = button.dataset;

    if (digit !== undefined) inputDigit(digit);
    else if (op !== undefined) chooseOp(op);
    else if (action === "equals") equals();
    else if (action === "clear") reset();
    else if (action === "percent") percent();
    else if (action === "negate") negate();
    else if (action === "backspace") backspace();
    else return;

    render();
  }

  keysEl.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) run(button);
  });

  function flash(selector) {
    const button = keysEl.querySelector(selector);
    if (!button) return;
    button.classList.add("is-pressed");
    setTimeout(() => button.classList.remove("is-pressed"), 110);
  }

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key;
    const onButton = document.activeElement?.tagName === "BUTTON";
    let selector = null;

    if (/^\d$/.test(key)) {
      inputDigit(key);
      selector = `[data-digit="${key}"]`;
    } else if (key === "." || key === ",") {
      inputDigit(".");
      selector = '[data-digit="."]';
    } else if (key === "+") {
      chooseOp("+");
      selector = '[data-op="+"]';
    } else if (key === "-") {
      chooseOp("−");
      selector = '[data-op="−"]';
    } else if (key === "*" || key === "x" || key === "X") {
      chooseOp("×");
      selector = '[data-op="×"]';
    } else if (key === "/") {
      chooseOp("÷");
      selector = '[data-op="÷"]';
    } else if (key === "Enter" || key === "=") {
      if (onButton) return; // let the focused button handle its own activation
      equals();
      selector = '[data-action="equals"]';
    } else if (key === "Backspace") {
      backspace();
      selector = '[data-action="backspace"]';
    } else if (key === "Escape" || key === "Delete") {
      reset();
      selector = '[data-action="clear"]';
    } else if (key === "%") {
      percent();
      selector = '[data-action="percent"]';
    } else {
      return;
    }

    event.preventDefault();
    render();
    if (selector) flash(selector);
  });

  render();
})();
