package utils

import "regexp"

// MatchRegex returns true if the pattern matches the target string.
func MatchRegex(pattern, target string) bool {
	if pattern == "" {
		return false
	}
	matched, err := regexp.MatchString(pattern, target)
	if err != nil {
		return false
	}
	return matched
}
