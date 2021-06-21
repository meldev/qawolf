import waitUntil from "async-wait-until";
import { Page } from "playwright";

import { CodeModel } from "../../src/code/CodeModel";
import { ElementChooser } from "../../src/environment/ElementChooser";
import { ElementChooserValue } from "../../src/types";
import { launch, LaunchResult, setBody } from "../utils";

let launched: LaunchResult;
let page: Page;
let variables: Record<string, any> = {}

const chooser = new ElementChooser({ codeModel: new CodeModel(), variables });
let events: ElementChooserValue[] = [];

chooser.on("elementchooser", (e) => events.push(e));

beforeAll(async () => {
  launched = await launch();
  page = launched.page;
  variables.page = page;
  await chooser.setContext(launched.context);
});

afterAll(() => launched.browser.close());

function isActionRecorderStarted(): Promise<boolean> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qawolf: any = (window as any).qawolf;
    return qawolf.actionRecorder._isStarted;
  });
}

function isElementChooserStarted(): Promise<boolean> {
  return page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qawolf: any = (window as any).qawolf;
    return qawolf.elementChooser._view._isStarted;
  });
}

beforeEach(async () => {
  await setBody(page, "<button>hello</button>");
  events = [];
  await chooser.start();
});

describe("start", () => {
  it("stops the action recorder", async () => {
    expect(await isActionRecorderStarted()).toBe(false);
  });

  it("starts the element chooser", async () => {
    expect(await isElementChooserStarted()).toBe(true);
  });

  it("emits isActive true", () => {
    expect(events[0]).toEqual(expect.objectContaining({ isActive: true }));
  });
});

describe("stop", () => {
  beforeEach(async () => {
    await chooser.stop();
  });

  it("starts the action recorder", async () => {
    expect(await isActionRecorderStarted()).toBe(true);
  });

  it("stops the element chooser", async () => {
    expect(await isElementChooserStarted()).toBe(false);
  });

  it("emits isActive false", () => {
    expect(events[1]).toEqual(expect.objectContaining({ isActive: false }));
  });
});

it("emits elements for the current context", async () => {
  await page.click("button");

  await waitUntil(() => events.length > 1);

  expect(events[1]).toEqual({
    initializeCode: "",
    isActive: true,
    isFillable: false,
    page,
    selectors: [],
    text: "hello",
    variable: "page"
  });

  // change the context and check it emits those events
  const context2 = await launched.browser.newContext();
  await chooser.setContext(context2);

  const page2 = await context2.newPage();
  variables.page2 = page2;
  // workaround since we need to navigate for init script
  await page2.goto("file://" + require.resolve("../fixtures/empty.html"));
  await setBody(page2, "<a>context2</a>");

  events = [];

  await chooser.start();
  await page2.click("a");

  await waitUntil(() => events.length > 1);

  expect(events[1]).toEqual({
    initializeCode: "",
    isActive: true,
    isFillable: false,
    page: page2,
    selectors: [],
    text: "context2",
    variable: "page2"
  });
});
