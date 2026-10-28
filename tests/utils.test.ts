import { expect,test } from "vitest";
import { marginCents,minimumReached,soles } from "../lib/utils";
test("minimum only reached at threshold",()=>{expect(minimumReached(34,35)).toBe(false);expect(minimumReached(35,35)).toBe(true);});
test("margin reflects prize and costs",()=>expect(marginCents(40,300,7500,1000)).toBe(3500));
test("currency conversion",()=>expect(soles(300)).toContain("3"));
