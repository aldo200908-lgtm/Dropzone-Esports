import { expect,test } from "vitest";
import { marginCents,minimumReached,soles,peruLocalToISO } from "../lib/utils";
test("minimum only reached at threshold",()=>{expect(minimumReached(34,35)).toBe(false);expect(minimumReached(35,35)).toBe(true);});
test("margin reflects prize and costs",()=>expect(marginCents(40,300,7500,1000)).toBe(3500));
test("currency conversion",()=>expect(soles(300)).toContain("3"));
test("Peru wall time converts to UTC",()=>expect(peruLocalToISO("2026-10-28T20:00")).toBe("2026-10-29T01:00:00.000Z"));
