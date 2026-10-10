#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "LVTypes.h"
#include "LVAvatarCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UStaticMeshComponent;
class ULVInteractionComponent;

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
    virtual void PlayInteractionPose(ELVCoupleInteraction Interaction, bool bIsPartner);

    UFUNCTION(BlueprintCallable)
    void SetLookAtTarget(FVector TargetLocation);

    UFUNCTION(BlueprintCallable)
    void SetAvatarProportions(float HeightScale, float BodyScale);

    virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

    UFUNCTION(BlueprintPure)
    ULVInteractionComponent* GetInteractionComponent() const { return InteractionComponent; }

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

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Camera")
    USpringArmComponent* CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Camera")
    UCameraComponent* FollowCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LoveVerse|Interaction")
    ULVInteractionComponent* InteractionComponent;

private:
    void MoveForward(float Value);
    void MoveRight(float Value);
    void Turn(float Value);
    void LookUp(float Value);
    void ApplyColor(UStaticMeshComponent* Component, const FLinearColor& Color);
    FRotator ArmPoseForInteraction(ELVCoupleInteraction Interaction, bool bLeftArm, bool bIsPartner) const;
};
