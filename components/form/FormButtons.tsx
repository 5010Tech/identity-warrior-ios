import { StyleSheet } from "react-native";
import { Button } from "../Button";
import { Row, Col } from "../Structure";
import { tHelper } from "@/translations/translationHelper";

interface FormButtonProps {
  onSubmit: (...args: any[]) => void;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
}

export const FormButtons = ({
  onCancel,
  onSubmit,
  submitDisabled = false,
  cancelDisabled = false,
  submitText = tHelper("done"),
  cancelText = tHelper("cancel"),
}: FormButtonProps) => {
  return (
    <Row style={styles.buttonContainer} gutter={2}>
      <Col>
        <Button
          onPress={onCancel}
          text={cancelText}
          variant="secondary"
          disabled={cancelDisabled}
        />
      </Col>
      <Col>
        <Button
          text={submitText}
          onPress={onSubmit}
          disabled={submitDisabled}
        />
      </Col>
    </Row>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
});
