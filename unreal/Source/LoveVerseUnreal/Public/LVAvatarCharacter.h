#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "LVTypes.h"
#include "LVAvatarCharacter.generated.h"

class UCameraComponent;
class UStaticMeshComponent;

UCLASS(Blueprintable)
class LOVEVERSEUNREAL_API ALVAvatarCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ALVAvatarCharacter();

    UFUNCTION(BlueprintCallable)
    void ApplyAvatarConfig(const FLVAvatarConfig& NewConfig);

    UFUNCTION(BlueprintCallable)
    void SetExpression(ELVFacialExpression NewExpression);

    UFUNCTION(BlueprintCallable)
    void PlayInteractionPose(ELVCoupleInteraction Interaction, bool bIsPartner);

    UFUNCTION(BlueprintCallable)
    void SetLookAtTarget(FVector TargetLocation);

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    USceneComponent* AvatarRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* Head;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* Hair;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* Body;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* LeftArm;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* RightArm;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* LeftLeg;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly)
    UStaticMeshComponent* RightLeg;

private:
    void ApplyColor(UStaticMeshComponent* Component, const FLinearColor& Color);
    FRotator ArmPoseForInteraction(ELVCoupleInteraction Interaction, bool bLeftArm, bool bIsPartner) const;
};
