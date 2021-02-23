import { Box } from "grommet";

import { state } from "../../../../lib/state";
import { ShortTest } from "../../../../lib/types";
import { copy } from "../../../../theme/copy";
import Button from "../../../shared-new/AppButton";
import Add from "../../../shared-new/icons/Add";
import RunTests from "./RunTests";

type Props = { tests: ShortTest[] };

export default function Buttons({ tests }: Props): JSX.Element {
  const handleCreateTestClick = (): void => {
    state.setModal({ name: "createTest" });
  };

  return (
    <Box align="center" direction="row">
      <RunTests tests={tests} />
      <Button
        IconComponent={Add}
        label={copy.createTest}
        onClick={handleCreateTestClick}
        type="primary"
      />
    </Box>
  );
}
