package utils

// SearchInSlice checks if val exists in the slice.
func SearchInSlice[T comparable](slice []T, val T) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}

// SearchStringInSlice checks if s is present in the slice.
func SearchStringInSlice(slice []string, s string) bool {
	return SearchInSlice(slice, s)
}
