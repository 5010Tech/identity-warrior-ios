import { MaterialCommunityIcons } from "@expo/vector-icons";
import { tHelper } from "@/translations/translationHelper";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useThemeColor } from "../themed";
import {
  countSelection,
  orderBySelectionCount,
} from "@/util/selectionCounts";
import { InputParent } from "./InputParent";
import { inputStyles, useInputColors } from "./styles";

export interface SelectOption {
  label: string;
  value: string;
}

interface InputSelectProps extends Omit<TextInputProps, "onChange" | "style"> {
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  label?: string;
  items?: SelectOption[];
  value?: string;
  placeholderLabel?: string;
  placeholdervalue?: string;
  disabled?: boolean;
  style?: ViewStyle;
  /** Form field name, passed by ControlledInput. */
  fieldName?: string;
  /** Names this list for the most-used ordering. Defaults to the field name, then the label. */
  countKey?: string;
}

/**
 * Dropdown field with the Android app's select-a-value picker
 * (dialog_value_picker.xml): a full-height sheet with a search field that filters
 * the list as you type, and tall rows with large text for use with gloves.
 */
export const InputSelect = ({
  onChange,
  required,
  error,
  label,
  style,
  items = [],
  value,
  placeholderLabel = tHelper("selectValue"),
  disabled = false,
  fieldName,
  countKey,
}: InputSelectProps) => {
  const countType = countKey ?? fieldName ?? label;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();

  const textColor = useThemeColor({}, "text");
  const strongColor = useThemeColor({}, "textStrong");
  const mutedColor = useThemeColor({}, "textSecondary");
  const surfaceColor = useThemeColor({}, "surface");
  const dividerColor = useThemeColor({}, "divider");
  const selectedBg = useThemeColor({}, "surfaceAlt");
  const linkColor = useThemeColor({}, "link");
  const colors = useInputColors();

  const selectedItem = useMemo(
    () => items.find((item) => item.value === value),
    [items, value],
  );
  const isPlaceholder = !selectedItem;

  // Most used values first, as in the Android picker. Re-ordered each time the
  // picker opens, so the list doesn't jump around while it is on screen.
  const ordered = useMemo(
    () => orderBySelectionCount(countType, items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, countType, open],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((item) => item.label.toLowerCase().includes(q));
  }, [ordered, search]);

  const openPicker = () => {
    if (disabled) return;
    setSearch("");
    setOpen(true);
  };
  const closePicker = () => setOpen(false);

  const choose = (next: string) => {
    countSelection(countType, next);
    onChange(next);
    closePicker();
  };

  return (
    <>
      <InputParent
        label={label}
        error={error}
        required={required}
        focused={open}
        onPress={openPicker}
        disabled={disabled}
      >
        <Pressable
          onPress={openPicker}
          disabled={disabled}
          style={[
            styles.input,
            {
              borderColor: colors.borderColor,
              backgroundColor: colors.backgroundColor,
            },
            style,
            disabled && styles.disabledInput,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: open }}
        >
          <Text
            style={[
              styles.inputText,
              { color: isPlaceholder ? mutedColor : textColor },
            ]}
            numberOfLines={1}
          >
            {selectedItem?.label ?? placeholderLabel}
          </Text>
          <MaterialCommunityIcons
            name="menu-down"
            size={28}
            color={disabled ? mutedColor : textColor}
          />
        </Pressable>
      </InputParent>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePicker}
      >
        <View style={[styles.sheet, { backgroundColor: surfaceColor }]}>
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: strongColor }]}
              numberOfLines={2}
            >
              {label ?? placeholderLabel}
            </Text>
            <Pressable
              onPress={closePicker}
              hitSlop={10}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={tHelper("cancel")}
            >
              <MaterialCommunityIcons name="close" size={30} color={strongColor} />
            </Pressable>
          </View>

          <View style={[styles.searchRow, { borderBottomColor: dividerColor }]}>
            <MaterialCommunityIcons name="magnify" size={28} color={mutedColor} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={tHelper("pickerSearchHint")}
              placeholderTextColor={mutedColor}
              style={[styles.search, { color: textColor }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ItemSeparatorComponent={() => (
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: mutedColor }]}>
                {tHelper("pickerNoMatches")}
              </Text>
            }
            ListFooterComponent={
              selectedItem && !required ? (
                <Pressable
                  onPress={() => choose("")}
                  style={[styles.row, styles.clearRow]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.clearText, { color: linkColor }]}>
                    {tHelper("pickerClearSelection")}
                  </Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <Pressable
                  onPress={() => choose(item.value)}
                  style={({ pressed }) => [
                    styles.row,
                    (selected || pressed) && { backgroundColor: selectedBg },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.rowText,
                      { color: textColor },
                      selected && styles.rowTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={28}
                      color={strongColor}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    ...inputStyles.input,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  disabledInput: {
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 18,
  },
  sheet: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 24,
    paddingRight: 8,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  iconButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    minHeight: 64,
    borderBottomWidth: 1,
  },
  search: {
    flex: 1,
    fontSize: 22,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 22,
  },
  rowTextSelected: {
    fontWeight: "700",
  },
  divider: {
    height: 1,
  },
  empty: {
    textAlign: "center",
    padding: 32,
    fontSize: 20,
  },
  clearRow: {
    justifyContent: "center",
  },
  clearText: {
    fontSize: 20,
    fontWeight: "600",
  },
});
