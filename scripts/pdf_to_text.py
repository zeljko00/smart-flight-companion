import argparse

from pypdf import PdfReader

def convert(input, output):

    reader = PdfReader(input)
    with open(output, "w", encoding="utf-8") as f:
        for page in reader.pages:
            text = page.extract_text()
            if text:
                f.write(text + "\n")

def main():
    parser = argparse.ArgumentParser(description="Extract text from a PDF file.")
    parser.add_argument("pdf", help="Path to the input PDF file")
    parser.add_argument("txt", help="Path to the output text file", default="output.txt")
    args = parser.parse_args()
    convert(args.pdf, args.txt)


if __name__ == "__main__":
    main()