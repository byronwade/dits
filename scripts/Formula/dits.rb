# typed: false
# frozen_string_literal: true

class Dits < Formula
  desc "Version control for video and large binary files"
  homepage "https://github.com/byronwade/dits"
  version "0.1.2"
  license any_of: ["Apache-2.0", "MIT"]

  on_macos do
    on_arm do
      url "https://github.com/byronwade/dits/releases/download/v#{version}/dits-darwin-arm64.tar.gz"
      sha256 "da2f1a6e53da473893ac598b59494c606baa4b3d88d1b9c1a5b5bbc909c06cb1"
    end
    on_intel do
      url "https://github.com/byronwade/dits/releases/download/v#{version}/dits-darwin-x64.tar.gz"
      sha256 "5ebf89a240e114e7ab3aaafa80421eb5a5e9604fdbacc3baf6878394dab6510f"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/byronwade/dits/releases/download/v#{version}/dits-linux-arm64.tar.gz"
      sha256 "0bd8b5f76ab1f04509c0292c682419d8ac2f20a6c980e12b47b591a9e77eba55"
    end
    on_intel do
      url "https://github.com/byronwade/dits/releases/download/v#{version}/dits-linux-x64.tar.gz"
      sha256 "9f97c6ac51dba2907a09f6642e471265a5e7c8c74dee9b318e70a7386f8ea4cb"
    end
  end

  def install
    bin.install "dits"
  end

  test do
    system "#{bin}/dits", "--version"
  end
end
