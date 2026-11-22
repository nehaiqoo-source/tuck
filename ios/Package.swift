// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Tuck",
    platforms: [.iOS(.v18)],
    products: [
        .library(name: "Tuck", targets: ["Tuck"]),
    ],
    dependencies: [
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "12.13.0"),
    ],
    targets: [
        .target(
            name: "Tuck",
            dependencies: [
                .product(name: "FirebaseAI", package: "firebase-ios-sdk"),
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
            ],
            path: "Tuck",
            exclude: ["GoogleService-Info.plist"]
        ),
    ]
)
