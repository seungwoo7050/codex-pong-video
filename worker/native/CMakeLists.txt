# [빌드] worker/native/CMakeLists.txt
# 설명:
#   - Native Helper 바이너리를 빌드하기 위한 CMake 설정이다.
# 버전: v0.6.0
# 관련 설계문서:
#   - design/contracts/v0.6.0-portfolio-media-contract.md

cmake_minimum_required(VERSION 3.16)
project(native_helper LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(native_helper src/main.cpp)
find_package(Threads REQUIRED)
target_link_libraries(native_helper PRIVATE Threads::Threads)
