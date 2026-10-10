#include "LVAvatarCharacter.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

ALVAvatarCharacter::ALVAvatarCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    AvatarRoot = CreateDefaultSubobject<USceneComponent>(TEXT("AvatarRoot"));
    AvatarRoot->SetupAttachment(GetRootComponent());

    Head = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Head"));
    Hair = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Hair"));
    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Body"));
    LeftArm = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftArm"));
    RightArm = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightArm"));
    LeftLeg = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftLeg"));
    RightLeg = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightLeg"));

    TArray<UStaticMeshComponent*> Parts = { Head, Hair, Body, LeftArm, RightArm, LeftLeg, RightLeg };
    for (UStaticMeshComponent* Part : Parts)
    {
        Part->SetupAttachment(AvatarRoot);
        Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    }

    static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeMesh(TEXT("/Engine/BasicShapes/Cube.Cube"));

    if (SphereMesh.Succeeded())
    {
        Head->SetStaticMesh(SphereMesh.Object);
        Hair->SetStaticMesh(SphereMesh.Object);
    }
    if (CubeMesh.Succeeded())
    {
        Body->SetStaticMesh(CubeMesh.Object);
        LeftArm->SetStaticMesh(CubeMesh.Object);
        RightArm->SetStaticMesh(CubeMesh.Object);
        LeftLeg->SetStaticMesh(CubeMesh.Object);
        RightLeg->SetStaticMesh(CubeMesh.Object);
    }

    Head->SetRelativeLocation(FVector(0, 0, 155));
    Head->SetRelativeScale3D(FVector(0.42f, 0.42f, 0.46f));
    Hair->SetRelativeLocation(FVector(0, -3, 172));
    Hair->SetRelativeScale3D(FVector(0.45f, 0.45f, 0.24f));
    Body->SetRelativeLocation(FVector(0, 0, 95));
    Body->SetRelativeScale3D(FVector(0.52f, 0.28f, 0.72f));
    LeftArm->SetRelativeLocation(FVector(0, -35, 100));
    RightArm->SetRelativeLocation(FVector(0, 35, 100));
    LeftArm->SetRelativeScale3D(FVector(0.16f, 0.16f, 0.62f));
    RightArm->SetRelativeScale3D(FVector(0.16f, 0.16f, 0.62f));
    LeftLeg->SetRelativeLocation(FVector(0, -16, 35));
    RightLeg->SetRelativeLocation(FVector(0, 16, 35));
    LeftLeg->SetRelativeScale3D(FVector(0.18f, 0.18f, 0.58f));
    RightLeg->SetRelativeScale3D(FVector(0.18f, 0.18f, 0.58f));
}

void ALVAvatarCharacter::BeginPlay()
{
    Super::BeginPlay();
}

void ALVAvatarCharacter::ApplyAvatarConfig(const FLVAvatarConfig& NewConfig)
{
    ApplyColor(Head, NewConfig.SkinColor);
    ApplyColor(Hair, NewConfig.HairColor);
    ApplyColor(Body, NewConfig.ShirtColor);
    ApplyColor(LeftArm, NewConfig.SkinColor);
    ApplyColor(RightArm, NewConfig.SkinColor);
    ApplyColor(LeftLeg, NewConfig.PantsColor);
    ApplyColor(RightLeg, NewConfig.PantsColor);
    SetExpression(NewConfig.Expression);
}

void ALVAvatarCharacter::SetExpression(ELVFacialExpression NewExpression)
{
    const float ScaleBoost = NewExpression == ELVFacialExpression::Excited ? 1.08f : 1.0f;
    Head->SetRelativeScale3D(FVector(0.42f, 0.42f, 0.46f) * ScaleBoost);
}

void ALVAvatarCharacter::PlayInteractionPose(ELVCoupleInteraction Interaction, bool bIsPartner)
{
    LeftArm->SetRelativeRotation(ArmPoseForInteraction(Interaction, true, bIsPartner));
    RightArm->SetRelativeRotation(ArmPoseForInteraction(Interaction, false, bIsPartner));

    if (Interaction == ELVCoupleInteraction::Dance)
    {
        Body->SetRelativeRotation(FRotator(0, bIsPartner ? -12 : 12, 5));
    }
    else
    {
        Body->SetRelativeRotation(FRotator::ZeroRotator);
    }
}

void ALVAvatarCharacter::SetLookAtTarget(FVector TargetLocation)
{
    const FVector Direction = TargetLocation - GetActorLocation();
    SetActorRotation(Direction.Rotation());
}

void ALVAvatarCharacter::ApplyColor(UStaticMeshComponent* Component, const FLinearColor& Color)
{
    if (!Component)
    {
        return;
    }

    UMaterialInstanceDynamic* Material = Component->CreateAndSetMaterialInstanceDynamic(0);
    if (Material)
    {
        Material->SetVectorParameterValue(TEXT("Color"), Color);
        Material->SetVectorParameterValue(TEXT("BaseColor"), Color);
    }
}

FRotator ALVAvatarCharacter::ArmPoseForInteraction(ELVCoupleInteraction Interaction, bool bLeftArm, bool bIsPartner) const
{
    const float Side = bLeftArm ? -1.0f : 1.0f;
    switch (Interaction)
    {
    case ELVCoupleInteraction::Hug:
    case ELVCoupleInteraction::Cuddle:
        return FRotator(0, Side * (bIsPartner ? -44 : 44), 78);
    case ELVCoupleInteraction::Kiss:
    case ELVCoupleInteraction::ForeheadKiss:
        return FRotator(18, Side * 22, 54);
    case ELVCoupleInteraction::HoldHands:
        return FRotator(0, Side * 62, 22);
    case ELVCoupleInteraction::Wave:
    case ELVCoupleInteraction::BlowKiss:
        return FRotator(0, Side * 18, bLeftArm ? -8 : 92);
    case ELVCoupleInteraction::Dance:
        return FRotator(0, Side * 75, bLeftArm ? -35 : 35);
    default:
        return FRotator::ZeroRotator;
    }
}
