#pragma once

#include "CoreMinimal.h"
#include "LVTypes.generated.h"

UENUM(BlueprintType)
enum class ELVFacialExpression : uint8
{
    Happy,
    Loving,
    Blushing,
    Excited,
    Laughing,
    Shy,
    Surprised,
    Sad
};

UENUM(BlueprintType)
enum class ELVCoupleInteraction : uint8
{
    Idle,
    Hug,
    Kiss,
    Cuddle,
    HoldHands,
    ForeheadKiss,
    FlyingHearts,
    BlowKiss,
    Dance,
    SitTogether,
    SleepBeside,
    Walk,
    Wave
};

UENUM(BlueprintType)
enum class ELVLocomotionState : uint8
{
    Idle,
    Walking,
    Running,
    Turning,
    Sitting,
    Standing,
    Jumping
};

USTRUCT(BlueprintType)
struct FLVInteractionDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ELVCoupleInteraction Interaction = ELVCoupleInteraction::Idle;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RequiredDistance = 350.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bRequiresPartnerConsent = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float ApproachDuration = 1.25f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float InteractionDuration = 3.0f;
};

USTRUCT(BlueprintType)
struct FLVAvatarConfig
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor SkinColor = FLinearColor(0.99f, 0.87f, 0.70f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor HairColor = FLinearColor(0.25f, 0.14f, 0.07f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor EyeColor = FLinearColor(0.25f, 0.16f, 0.13f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor ShirtColor = FLinearColor(1.0f, 0.36f, 0.54f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor PantsColor = FLinearColor(0.16f, 0.13f, 0.22f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString HairStyle = TEXT("wavy");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    ELVFacialExpression Expression = ELVFacialExpression::Happy;
};

USTRUCT(BlueprintType)
struct FLVAvatarAppearance
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor SkinColor = FLinearColor(0.99f, 0.87f, 0.70f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor HairColor = FLinearColor(0.25f, 0.14f, 0.07f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor EyeColor = FLinearColor(0.25f, 0.16f, 0.13f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor ClothingColor = FLinearColor(1.0f, 0.36f, 0.54f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString FaceShape = TEXT("round");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString HairStyle = TEXT("wavy");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString OutfitId = TEXT("casual_default");

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString AccessoryId = TEXT("none");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0.85", ClampMax="1.15"))
    float HeightScale = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0.85", ClampMax="1.15"))
    float BodyScale = 1.0f;
};

USTRUCT(BlueprintType)
struct FLVSessionContext
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString CoupleId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString UserId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString SupabaseUrl;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString SupabaseAnonKey;
};
