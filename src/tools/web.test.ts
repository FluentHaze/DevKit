import { describe, expect, it } from 'vitest';
import { curlToCode, tokenizeCurl } from './web';

describe('Windows CMD cURL', () => {
  it('does not interpret caret characters in POSIX quoted values as CMD syntax', () => {
    expect(tokenizeCurl(`curl --url 'https://example.test' -H 'X-Test: ^"literal'`)).toEqual([
      'curl',
      '--url',
      'https://example.test',
      '-H',
      'X-Test: ^"literal',
    ]);
    expect(tokenizeCurl(String.raw`curl -X POST ^"https://example.test^"`)).toEqual([
      'curl',
      '-X',
      'POST',
      'https://example.test',
    ]);
  });
  it('preserves percent-encoded URL values in CMD commands', () => {
    expect(
      tokenizeCurl(String.raw`curl ^"https://example.test/?q=%E4%BD%A0%E5%A5%BD^&x=a%20b^"`)[1]
    ).toBe('https://example.test/?q=%E4%BD%A0%E5%A5%BD&x=a%20b');
  });
  const command = String.raw`curl --url ^"https://example.test/mini/front?_func=NA.GetFrontMakers^&lang=1^&token=pass^&os=1^&at=0^&cp=-1^&v=1793184249^&apiv=1^&proj=x^" ^
  -H ^"Accept: */*^" ^
  -H ^"Content-Type: application/json^" ^
  -H ^"User-Agent: Mozilla/5.0 ^(Windows NT 10.0; Win64; x64^) AppleWebKit/537.36 ^(KHTML, like Gecko^) Chrome/155.0.0.0 Safari/537.36^" ^
  -H ^"sec-ch-ua: ^\^"Google Chrome^\^";v=^\^"155^\^", ^\^"Chromium^\^";v=^\^"155^\^", ^\^"Not^(A:Brand^\^";v=^\^"24^\^"^" ^
  -H ^"sec-ch-ua-platform: ^\^"Windows^\^"^"`;

  it.each(['\n', '\r\n'])('preserves URL and quoted headers with %j line endings', (eol) => {
    const tokens = tokenizeCurl(command.replaceAll('\n', eol));
    expect(tokens[2]).toBe(
      'https://example.test/mini/front?_func=NA.GetFrontMakers&lang=1&token=pass&os=1&at=0&cp=-1&v=1793184249&apiv=1&proj=x'
    );
    expect(tokens).toContain(
      'sec-ch-ua: "Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"'
    );
    expect(tokens).toContain('sec-ch-ua-platform: "Windows"');
    expect(tokens).toContain(
      'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'
    );
  });

  it.each(['fetch', 'axios', 'python'])('generates %s code', (target) => {
    const result = curlToCode(command, target);
    expect(result).toContain('GET');
    expect(result).toContain('sec-ch-ua');
    expect(result).not.toContain('^');
  });

  it('preserves JSON bodies and empty arguments', () => {
    expect(
      tokenizeCurl(
        String.raw`curl ^"https://example.test^" --data-raw ^"{^\^"name^\^":^\^"DevKit^\^"}^"`
      )
    ).toEqual(['curl', 'https://example.test', '--data-raw', '{"name":"DevKit"}']);
    expect(tokenizeCurl(String.raw`curl ^"https://example.test^" -d ^"^"`).at(-1)).toBe('');
  });

  it.each([
    String.raw`curl ^"https://example.test^" & echo hello`,
    String.raw`curl ^"https://example.test/%TOKEN%^"`,
    String.raw`curl ^"https://example.test/!TOKEN!^"`,
    String.raw`curl ^"https://example.test`,
    String.raw`curl ^"https://example.test^" --upload-file @file`,
  ])('rejects unsupported CMD syntax', (input) => {
    expect(() => curlToCode(input, 'fetch')).toThrow('unsupported');
  });
});
