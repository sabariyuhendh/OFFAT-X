package fuzzer

import (
	"crypto/rand"
	"math/big"
)

// GenerateRandomIntInRange returns a cryptographically-random integer in [min, max].
func GenerateRandomIntInRange(min, max int) (int, error) {
	rangeSize := max - min + 1
	n, err := rand.Int(rand.Reader, big.NewInt(int64(rangeSize)))
	if err != nil {
		return 0, err
	}
	return int(n.Int64()) + min, nil
}

// GenerateRandomString returns a random alphanumeric string of the given length.
func GenerateRandomString(length int) (string, error) {
	charset := AlphaDigits
	result := make([]byte, length)
	for i := range result {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		result[i] = charset[n.Int64()]
	}
	return string(result), nil
}

// FuzzStringValue generates a list of fuzz strings for string-type parameters.
func FuzzStringValue(name string) []string {
	return []string{
		"test_" + name,
		"1",
		"null",
		"<fuzz>",
		"0",
		"true",
		"' OR '1'='1",
	}
}

// FuzzIntValue generates a list of fuzz integers.
func FuzzIntValue() []int {
	return []int{0, 1, -1, 9999, 999999999}
}
