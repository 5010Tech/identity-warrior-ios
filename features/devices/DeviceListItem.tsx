import { InputToggle } from "@/components/input/InputToggle";
import { Col, Row } from "@/components/Structure";
import { H3, Text, useThemeColor, View } from "@/components/themed";
import { Device } from "@/types/Device";
import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

interface DeviceListItemProps extends Device {
  setActive: () => Promise<void> | void;
  onDelete: () => void;
}
export const DeviceListItem = ({
  ssid,
  modelNumber,
  serialNumber,
  selected,
  setActive,
  onDelete,
}: DeviceListItemProps) => {
  const primaryColor = useThemeColor({}, "primary");
  const dangerColor = useThemeColor({}, "danger");

  const renderRightActions = () => {
    return (
      <View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: dangerColor }]}
          onPress={onDelete}
        >
          <FontAwesome size={24} color={"#FFF"} name="trash" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <Row style={[styles.container, { borderBottomColor: primaryColor }]}>
        <Col style={styles.textContainer} size={5}>
          <H3>
            {modelNumber} - {serialNumber}
          </H3>
          <Text>{ssid}</Text>
        </Col>
        <Col size={1}>
          <InputToggle label="Active" onChange={setActive} value={selected} />
        </Col>
      </Row>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  actionText: {
    color: "#FFF",
  },
  actionButton: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  container: {
    width: "100%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 10,
    borderBottomWidth: 1,
  },
  textContainer: {
    justifyContent: "center",
  },
});
