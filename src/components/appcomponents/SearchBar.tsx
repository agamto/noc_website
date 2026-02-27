import React ,{ useState, ChangeEvent } from "react";

interface SearchBarProps {
  onSearch?: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = "Search..." }: SearchBarProps) {
  const [value, setValue] = useState("");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onSearch?.(newValue); // send value to parent
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      style={{ padding: "8px", borderRadius: "6px", width: "100%" }}
    />
  );
}