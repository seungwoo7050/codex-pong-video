#include <algorithm>
#include <cstdint>
#include <cstddef>
#include <cstdlib>
#include <cstring>
#include <exception>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

/**
 * [Native Helper] worker/native/src/main.cpp
 * 설명:
 *   - 프레임 바이너리를 읽어 MSE 기반 유사도를 계산하는 엔트리 프로그램이다.
 *   - JSON 결과를 표준 출력으로 반환한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
class IJob {
 public:
  virtual ~IJob() = default;
  virtual double Execute() const = 0;
};

class FrameAnalyzerJob : public IJob {
 public:
  FrameAnalyzerJob(std::vector<uint8_t> first, std::vector<uint8_t> second)
      : first_(std::move(first)), second_(std::move(second)) {}

  double Execute() const override { return CalculateMse(); }

 private:
  double CalculateMse() const {
    const size_t size = std::min(first_.size(), second_.size());
    if (size == 0 || first_.size() != second_.size()) {
      throw std::runtime_error("프레임 크기가 유효하지 않습니다.");
    }

    const size_t alignment = 64;
    const AlignedBuffer aligned_first = AlignBuffer(first_, alignment);
    const AlignedBuffer aligned_second = AlignBuffer(second_, alignment);

    const uint8_t* first_ptr = aligned_first.data.get();
    const uint8_t* second_ptr = aligned_second.data.get();
    const size_t thread_count = std::max<size_t>(1, std::thread::hardware_concurrency());
    const size_t chunk_size = (size + thread_count - 1) / thread_count;
    std::vector<std::thread> threads;
    threads.reserve(thread_count);
    std::vector<double> partial_sums(thread_count, 0.0);

    for (size_t t = 0; t < thread_count; ++t) {
      const size_t begin = t * chunk_size;
      if (begin >= size) {
        break;
      }
      const size_t end = std::min(size, begin + chunk_size);
      threads.emplace_back([first_ptr, second_ptr, begin, end, &partial_sums, t]() {
        double local_sum = 0.0;
        size_t i = begin;
        const size_t aligned_end = begin + ((end - begin) / 8) * 8;
        for (; i < aligned_end; i += 8) {
          for (size_t j = 0; j < 8; ++j) {
            const double diff = static_cast<double>(first_ptr[i + j]) - static_cast<double>(second_ptr[i + j]);
            local_sum += diff * diff;
          }
        }
        for (; i < end; ++i) {
          const double diff = static_cast<double>(first_ptr[i]) - static_cast<double>(second_ptr[i]);
          local_sum += diff * diff;
        }
        partial_sums[t] = local_sum;
      });
    }
    for (auto& thread : threads) {
      thread.join();
    }

    double sum = 0.0;
    for (double partial : partial_sums) {
      sum += partial;
    }

    const double mse = sum / static_cast<double>(size);
    return mse / (255.0 * 255.0);
  }

  std::vector<uint8_t> first_;
  std::vector<uint8_t> second_;

  struct AlignedBuffer {
    std::unique_ptr<uint8_t[], void (*)(void*)> data;
  };

  static AlignedBuffer AlignBuffer(const std::vector<uint8_t>& source, size_t alignment) {
    size_t padded = source.size();
    if (padded % alignment != 0) {
      padded += alignment - (padded % alignment);
    }
    void* raw = std::aligned_alloc(alignment, padded);
    if (!raw) {
      throw std::runtime_error("정렬된 메모리 할당에 실패했습니다.");
    }
    std::unique_ptr<uint8_t[], void (*)(void*)> buffer(reinterpret_cast<uint8_t*>(raw), std::free);
    std::memcpy(buffer.get(), source.data(), source.size());
    if (padded > source.size()) {
      std::memset(buffer.get() + source.size(), 0, padded - source.size());
    }
    return AlignedBuffer{std::move(buffer)};
  }
};

std::vector<uint8_t> ReadBinaryFile(const std::string& path) {
  std::ifstream input(path, std::ios::binary);
  if (!input) {
    throw std::runtime_error("파일을 열 수 없습니다: " + path);
  }
  std::vector<uint8_t> data((std::istreambuf_iterator<char>(input)),
                            std::istreambuf_iterator<char>());
  return data;
}

std::vector<uint8_t> ReadStdinBinary() {
  std::vector<uint8_t> data((std::istreambuf_iterator<char>(std::cin)),
                            std::istreambuf_iterator<char>());
  return data;
}

void PrintSuccess(double diff_score) {
  std::ostringstream out;
  out << std::fixed << std::setprecision(6) << diff_score;
  std::cout << "{\"status\": \"success\", \"diff_score\": " << out.str() << "}";
}

void PrintError(const std::string& message) {
  std::cout << "{\"status\": \"error\", \"error_code\": \"FAILED_NATIVE_VALIDATION\", \"message\": \"";
  for (char c : message) {
    if (c == '\"') {
      std::cout << '\\' << '"';
    } else {
      std::cout << c;
    }
  }
  std::cout << "\"}";
}

int main(int argc, char* argv[]) {
  try {
    if (argc >= 2 && std::string(argv[1]) == "--stdin") {
      if (argc < 5) {
        PrintError("stdin 모드에서 width/height/channels 인자가 필요합니다.");
        return 1;
      }
      const size_t width = std::stoul(argv[2]);
      const size_t height = std::stoul(argv[3]);
      const size_t channels = std::stoul(argv[4]);
      const size_t frame_size = width * height * channels;
      if (frame_size == 0) {
        PrintError("프레임 크기가 0입니다.");
        return 1;
      }
      std::vector<uint8_t> buffer = ReadStdinBinary();
      if (buffer.size() != frame_size * 2) {
        PrintError("입력 프레임 길이가 예상과 다릅니다.");
        return 1;
      }
      std::vector<uint8_t> first(buffer.begin(), buffer.begin() + static_cast<std::ptrdiff_t>(frame_size));
      std::vector<uint8_t> second(buffer.begin() + static_cast<std::ptrdiff_t>(frame_size), buffer.end());
      FrameAnalyzerJob job(std::move(first), std::move(second));
      const double diff_score = job.Execute();
      PrintSuccess(diff_score);
      return 0;
    }

    if (argc < 3) {
      PrintError("frame path 인자가 부족합니다.");
      return 1;
    }
    const std::string first_path = argv[1];
    const std::string second_path = argv[2];
    std::vector<uint8_t> first = ReadBinaryFile(first_path);
    std::vector<uint8_t> second = ReadBinaryFile(second_path);
    FrameAnalyzerJob job(std::move(first), std::move(second));
    const double diff_score = job.Execute();
    PrintSuccess(diff_score);
    return 0;
  } catch (const std::exception& ex) {
    PrintError(ex.what());
    return 1;
  }
}
