import { useDropdownOptions } from "./useDropdownOptions";

/**
 * Hook that returns university names from the dropdown_options table
 * for use in autocomplete fields and suggestions.
 */
export function useUniversityOptions() {
  const { data: options = [], isLoading } = useDropdownOptions('university');
  
  const universityNames = options.map(o => o.option_value);
  
  return { universityNames, isLoading, options };
}
